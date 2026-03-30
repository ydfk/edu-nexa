package contentsafety

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	neturl "net/url"
	"strings"
	"sync"
	"time"

	"github.com/ydfk/edu-nexa/apps/api/internal/service/runtimeconfig"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/logger"
)

var accessTokenState struct {
	expiresAt time.Time
	mu        sync.Mutex
	token     string
}

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	ErrCode     int    `json:"errcode"`
	ErrMsg      string `json:"errmsg"`
	ExpiresIn   int    `json:"expires_in"`
}

type safetyResponse struct {
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
}

func CheckText(content string) error {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return nil
	}

	settings, err := runtimeconfig.GetSnapshot()
	if err != nil {
		return nil
	}
	if !settings.TextSecurityEnable {
		return nil
	}
	if config.Current.Wechat.AppID == "" || config.Current.Wechat.AppSecret == "" {
		return handleFailure(settings.TextSecurityStrict, "未配置微信内容安全能力")
	}

	accessToken, err := getAccessToken()
	if err != nil {
		return handleFailure(settings.TextSecurityStrict, err.Error())
	}

	payload := map[string]interface{}{
		"content": trimmed,
	}
	response := safetyResponse{}
	if err := doWeChatPost(
		"https://api.weixin.qq.com/wxa/msg_sec_check?access_token="+accessToken,
		payload,
		&response,
	); err != nil {
		return handleFailure(settings.TextSecurityStrict, err.Error())
	}
	if response.ErrCode != 0 {
		return handleFailure(settings.TextSecurityStrict, response.ErrMsg)
	}

	return nil
}

func CheckImageURL(imageURL string) error {
	trimmed := strings.TrimSpace(imageURL)
	if trimmed == "" {
		return nil
	}

	settings, err := runtimeconfig.GetSnapshot()
	if err != nil {
		return nil
	}
	if !settings.ImageSecurityEnable {
		return nil
	}
	if strings.Contains(trimmed, "127.0.0.1") || strings.Contains(trimmed, "localhost") {
		return handleFailure(settings.ImageSecurityStrict, "本地图片地址无法被微信内容安全服务访问")
	}
	if config.Current.Wechat.AppID == "" || config.Current.Wechat.AppSecret == "" {
		return handleFailure(settings.ImageSecurityStrict, "未配置微信内容安全能力")
	}

	accessToken, err := getAccessToken()
	if err != nil {
		return handleFailure(settings.ImageSecurityStrict, err.Error())
	}

	payload := map[string]interface{}{
		"media_type": 2,
		"media_url":  trimmed,
		"scene":      2,
		"version":    2,
	}
	response := safetyResponse{}
	if err := doWeChatPost(
		"https://api.weixin.qq.com/wxa/media_check_async?access_token="+accessToken,
		payload,
		&response,
	); err != nil {
		return handleFailure(settings.ImageSecurityStrict, err.Error())
	}
	if response.ErrCode != 0 {
		return handleFailure(settings.ImageSecurityStrict, response.ErrMsg)
	}

	return nil
}

func getAccessToken() (string, error) {
	accessTokenState.mu.Lock()
	defer accessTokenState.mu.Unlock()

	if accessTokenState.token != "" && time.Now().Before(accessTokenState.expiresAt) {
		return accessTokenState.token, nil
	}

	queryURL := fmt.Sprintf(
		"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s",
		neturl.QueryEscape(config.Current.Wechat.AppID),
		neturl.QueryEscape(config.Current.Wechat.AppSecret),
	)

	response, err := http.Get(queryURL)
	if err != nil {
		return "", fmt.Errorf("获取微信 access_token 失败")
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		return "", fmt.Errorf("读取微信 access_token 响应失败")
	}

	var payload tokenResponse
	if err := json.Unmarshal(body, &payload); err != nil {
		return "", fmt.Errorf("解析微信 access_token 响应失败")
	}
	if payload.ErrCode != 0 || payload.AccessToken == "" {
		return "", fmt.Errorf("获取微信 access_token 失败: %s", payload.ErrMsg)
	}

	accessTokenState.token = payload.AccessToken
	accessTokenState.expiresAt = time.Now().Add(time.Duration(payload.ExpiresIn-300) * time.Second)
	return accessTokenState.token, nil
}

func doWeChatPost(requestURL string, payload interface{}, target interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("生成微信安全校验请求失败")
	}

	response, err := http.Post(requestURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("调用微信安全校验失败")
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return fmt.Errorf("读取微信安全校验响应失败")
	}
	if err := json.Unmarshal(responseBody, target); err != nil {
		return fmt.Errorf("解析微信安全校验响应失败")
	}

	return nil
}

func handleFailure(strict bool, message string) error {
	if strict {
		if message == "" {
			return fmt.Errorf("内容安全校验失败")
		}
		return fmt.Errorf("内容安全校验失败: %s", message)
	}

	logger.Warn("内容安全校验跳过: %s", message)
	return nil
}
