package upload

import (
	"bytes"
	"crypto/md5"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	neturl "net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
	"github.com/google/uuid"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
)

const maxImageSize = 10 * 1024 * 1024
const maxFileSize = 20 * 1024 * 1024

var allowedImageExtensions = map[string]bool{
	".gif":  true,
	".heic": true,
	".jpe":  true,
	".jpeg": true,
	".jpg":  true,
	".png":  true,
	".webp": true,
}

var allowedFileExtensions = map[string]bool{
	".gif":  true,
	".heic": true,
	".jpe":  true,
	".jpeg": true,
	".jpg":  true,
	".png":  true,
	".webp": true,
	".pdf":  true,
}

type Result struct {
	Bucket    string `json:"bucket"`
	ObjectKey string `json:"objectKey"`
	Provider  string `json:"provider"`
	URL       string `json:"url"`
}

func UploadGeneratedFile(content []byte, contentType string, purpose string, extension string) (*Result, error) {
	if len(content) == 0 {
		return nil, fmt.Errorf("上传文件不能为空")
	}

	normalizedExtension := strings.ToLower(strings.TrimSpace(extension))
	if normalizedExtension == "" || !strings.HasPrefix(normalizedExtension, ".") {
		return nil, fmt.Errorf("文件后缀不正确")
	}

	targetProvider := resolveProvider("")
	objectKey := buildObjectKey(targetProvider, purpose, normalizedExtension)

	switch targetProvider {
	case "aliyun_oss":
		return uploadToAliyunOSS(content, contentType, objectKey)
	case "upyun":
		return uploadToUpYun(content, contentType, objectKey)
	default:
		return uploadToLocal(content, objectKey)
	}
}

func resolveProvider(provider string) string {
	value := strings.TrimSpace(strings.ToLower(provider))
	if value == "" {
		value = strings.TrimSpace(strings.ToLower(config.Current.Storage.DefaultProvider))
	}
	switch value {
	case "aliyun_oss", "upyun", "local":
		return value
	default:
		return "local"
	}
}

func buildObjectKey(provider string, purpose string, extension string) string {
	now := time.Now()
	return path.Join(
		resolveProviderPathPrefix(provider),
		sanitizePathSegment(purpose),
		now.Format("2006"),
		now.Format("01"),
		fmt.Sprintf("%s%s", uuid.NewString(), extension),
	)
}

func resolveProviderPathPrefix(provider string) string {
	switch provider {
	case "aliyun_oss":
		return sanitizePathSegment(config.Current.Storage.AliyunOSS.PathPrefix)
	case "upyun":
		return sanitizePathSegment(config.Current.Storage.UpYun.PathPrefix)
	default:
		return "local"
	}
}

func sanitizePathSegment(value string) string {
	trimmed := strings.TrimSpace(strings.ToLower(value))
	if trimmed == "" {
		return "images"
	}

	builder := strings.Builder{}
	for _, char := range trimmed {
		switch {
		case char >= 'a' && char <= 'z':
			builder.WriteRune(char)
		case char >= '0' && char <= '9':
			builder.WriteRune(char)
		case char == '-' || char == '_':
			builder.WriteRune(char)
		default:
			builder.WriteRune('-')
		}
	}

	result := strings.Trim(builder.String(), "-")
	if result == "" {
		return "images"
	}
	return result
}

func uploadToLocal(content []byte, objectKey string) (*Result, error) {
	localConfig := config.Current.Storage.Local
	dir := localConfig.Dir
	if dir == "" {
		dir = "data/uploads"
	}

	targetPath := filepath.Join(dir, filepath.FromSlash(objectKey))
	if err := os.MkdirAll(filepath.Dir(targetPath), os.ModePerm); err != nil {
		return nil, fmt.Errorf("创建本地上传目录失败")
	}
	if err := os.WriteFile(targetPath, content, 0o644); err != nil {
		return nil, fmt.Errorf("保存本地文件失败")
	}

	publicPath := strings.TrimRight(localConfig.PublicPath, "/")
	if publicPath == "" {
		publicPath = "/uploads"
	}

	return &Result{
		Bucket:    "",
		ObjectKey: objectKey,
		Provider:  "local",
		URL:       buildPublicURL(localConfig.BaseURL, path.Join(publicPath, objectKey)),
	}, nil
}

func uploadToAliyunOSS(content []byte, contentType string, objectKey string) (*Result, error) {
	bucket, ossConfig, err := getAliyunOSSBucket()
	if err != nil {
		return nil, err
	}

	if err := bucket.PutObject(objectKey, bytes.NewReader(content), oss.ContentType(contentType)); err != nil {
		return nil, fmt.Errorf("上传到阿里云 OSS 失败")
	}

	return &Result{
		Bucket:    strings.TrimSpace(ossConfig.Bucket),
		ObjectKey: objectKey,
		Provider:  "aliyun_oss",
		URL:       buildAliyunOSSURL(ossConfig, objectKey),
	}, nil
}

func uploadToUpYun(content []byte, contentType string, objectKey string) (*Result, error) {
	upyunConfig := config.Current.Storage.UpYun
	if upyunConfig.Bucket == "" || upyunConfig.FormAPISecret == "" {
		return nil, fmt.Errorf("又拍云配置不完整")
	}

	policyPayload := map[string]interface{}{
		"bucket":       upyunConfig.Bucket,
		"expiration":   time.Now().Add(30 * time.Minute).Unix(),
		"save-key":     "/" + objectKey,
		"content-type": contentType,
	}
	policyContent, err := json.Marshal(policyPayload)
	if err != nil {
		return nil, fmt.Errorf("生成又拍云上传策略失败")
	}

	policy := base64.StdEncoding.EncodeToString(policyContent)
	sum := md5.Sum([]byte(policy + "&" + upyunConfig.FormAPISecret))
	signature := hex.EncodeToString(sum[:])

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	if err := writer.WriteField("policy", policy); err != nil {
		return nil, fmt.Errorf("生成又拍云上传请求失败")
	}
	if err := writer.WriteField("signature", signature); err != nil {
		return nil, fmt.Errorf("生成又拍云上传请求失败")
	}
	fileWriter, err := writer.CreateFormFile("file", path.Base(objectKey))
	if err != nil {
		return nil, fmt.Errorf("生成又拍云上传请求失败")
	}
	if _, err := fileWriter.Write(content); err != nil {
		return nil, fmt.Errorf("生成又拍云上传请求失败")
	}
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("生成又拍云上传请求失败")
	}

	apiHost := strings.TrimRight(upyunConfig.APIHost, "/")
	if apiHost == "" {
		apiHost = "https://v0.api.upyun.com"
	}

	request, err := http.NewRequest(http.MethodPost, apiHost+"/"+upyunConfig.Bucket, body)
	if err != nil {
		return nil, fmt.Errorf("创建又拍云上传请求失败")
	}
	request.Header.Set("Content-Type", writer.FormDataContentType())

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("上传到又拍云失败")
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("上传到又拍云失败")
	}

	return &Result{
		Bucket:    strings.TrimSpace(upyunConfig.Bucket),
		ObjectKey: objectKey,
		Provider:  "upyun",
		URL:       buildPublicURL(upyunConfig.BaseURL, "/"+objectKey),
	}, nil
}

func buildPublicURL(baseURL string, objectPath string) string {
	base := strings.TrimRight(baseURL, "/")
	if base == "" {
		return objectPath
	}
	return base + objectPath
}

func buildAliyunOSSURL(ossConfig config.AliyunOSSConfig, objectKey string) string {
	if ossConfig.BaseURL != "" {
		return buildPublicURL(ossConfig.BaseURL, "/"+objectKey)
	}

	endpoint := strings.TrimSpace(ossConfig.Endpoint)
	if endpoint == "" {
		return "/" + objectKey
	}
	if !strings.Contains(endpoint, "://") {
		endpoint = "https://" + endpoint
	}

	parsed, err := neturl.Parse(endpoint)
	if err != nil {
		return endpoint + "/" + objectKey
	}

	return parsed.Scheme + "://" + ossConfig.Bucket + "." + parsed.Host + "/" + objectKey
}
