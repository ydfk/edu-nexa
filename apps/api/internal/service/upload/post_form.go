package upload

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
)

type AliyunPostFormResult struct {
	ExpiresAt string            `json:"expiresAt"`
	FormData  map[string]string `json:"formData"`
	Host      string            `json:"host"`
	ObjectKey string            `json:"objectKey"`
	Provider  string            `json:"provider"`
	PublicURL string            `json:"publicURL"`
}

func CreateAliyunPostForm(fileName string, contentType string, fileSize int64, purpose string, userID string) (*AliyunPostFormResult, error) {
	if resolveProvider("") != "aliyun_oss" {
		return nil, fmt.Errorf("当前上传存储未配置为阿里云 OSS")
	}

	_, extension, err := detectDirectUploadMeta(fileName, contentType)
	if err != nil {
		return nil, err
	}
	if err := validateDirectUploadSize(extension, fileSize); err != nil {
		return nil, err
	}

	credential, ossConfig, err := createAliyunSTSCredential(userID)
	if err != nil {
		return nil, err
	}

	objectKey := buildObjectKey("aliyun_oss", purpose, extension)
	expiresAt := time.Now().UTC().Add(time.Duration(directURLExpireInSeconds) * time.Second)
	formData, err := buildAliyunPostFormData(credential, ossConfig, objectKey, fileSize, expiresAt)
	if err != nil {
		return nil, err
	}

	return &AliyunPostFormResult{
		ExpiresAt: expiresAt.Format(time.RFC3339),
		FormData:  formData,
		Host:      buildAliyunOSSBucketHost(ossConfig),
		ObjectKey: objectKey,
		Provider:  "aliyun_oss",
		PublicURL: buildAliyunOSSURL(ossConfig, objectKey),
	}, nil
}

func buildAliyunPostFormData(
	credential *aliyunSTSCredential,
	ossConfig config.AliyunOSSConfig,
	objectKey string,
	fileSize int64,
	expiresAt time.Time,
) (map[string]string, error) {
	utcTime := time.Now().UTC()
	date := utcTime.Format("20060102")
	region := strings.TrimPrefix(strings.TrimSpace(ossConfig.Region), "oss-")
	credentialValue := fmt.Sprintf(
		"%s/%s/%s/oss/aliyun_v4_request",
		credential.accessKeyID,
		date,
		region,
	)

	policyMap := map[string]any{
		"expiration": expiresAt.UTC().Format("2006-01-02T15:04:05.000Z"),
		"conditions": []any{
			map[string]string{"bucket": ossConfig.Bucket},
			map[string]string{"key": objectKey},
			map[string]string{"x-oss-signature-version": "OSS4-HMAC-SHA256"},
			map[string]string{"x-oss-credential": credentialValue},
			map[string]string{"x-oss-date": utcTime.Format("20060102T150405Z")},
			map[string]string{"x-oss-security-token": credential.securityToken},
			map[string]string{"x-oss-forbid-overwrite": "true"},
			map[string]string{"success_action_status": "200"},
		},
	}
	if fileSize > 0 {
		policyMap["conditions"] = append(policyMap["conditions"].([]any), []any{"content-length-range", 1, fileSize})
	}

	policyJSON, err := json.Marshal(policyMap)
	if err != nil {
		return nil, fmt.Errorf("生成阿里云 OSS 表单策略失败")
	}

	policy := base64.StdEncoding.EncodeToString(policyJSON)
	signature := buildAliyunPostFormSignature(credential.accessKeySecret, date, region, policy)
	return map[string]string{
		"key":                      objectKey,
		"policy":                   policy,
		"success_action_status":    "200",
		"x-oss-credential":         credentialValue,
		"x-oss-date":               utcTime.Format("20060102T150405Z"),
		"x-oss-forbid-overwrite":   "true",
		"x-oss-security-token":     credential.securityToken,
		"x-oss-signature":          signature,
		"x-oss-signature-version":  "OSS4-HMAC-SHA256",
	}, nil
}

func buildAliyunPostFormSignature(secret string, date string, region string, policy string) string {
	h1 := hmac.New(sha256.New, []byte("aliyun_v4"+secret))
	h1.Write([]byte(date))

	h2 := hmac.New(sha256.New, h1.Sum(nil))
	h2.Write([]byte(region))

	h3 := hmac.New(sha256.New, h2.Sum(nil))
	h3.Write([]byte("oss"))

	h4 := hmac.New(sha256.New, h3.Sum(nil))
	h4.Write([]byte("aliyun_v4_request"))

	h5 := hmac.New(sha256.New, h4.Sum(nil))
	h5.Write([]byte(policy))

	return hex.EncodeToString(h5.Sum(nil))
}

func buildAliyunOSSBucketHost(ossConfig config.AliyunOSSConfig) string {
	endpoint := strings.TrimSpace(ossConfig.Endpoint)
	if endpoint == "" {
		return ""
	}
	if !strings.Contains(endpoint, "://") {
		endpoint = "https://" + endpoint
	}

	parsed, err := url.Parse(endpoint)
	if err != nil || parsed.Host == "" {
		return endpoint
	}

	return parsed.Scheme + "://" + ossConfig.Bucket + "." + parsed.Host
}
