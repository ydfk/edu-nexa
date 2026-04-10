package upload

import (
	"fmt"
	"mime"
	"net/url"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
)

const directURLExpireInSeconds int64 = 10 * 60

type DirectUploadURLResult struct {
	Bucket    string            `json:"bucket"`
	ExpiresAt string            `json:"expiresAt"`
	Headers   map[string]string `json:"headers"`
	Method    string            `json:"method"`
	ObjectKey string            `json:"objectKey"`
	Provider  string            `json:"provider"`
	PublicURL string            `json:"publicURL"`
	UploadURL string            `json:"uploadURL"`
}

type AccessURLResult struct {
	Bucket    string `json:"bucket"`
	ExpiresAt string `json:"expiresAt"`
	ObjectKey string `json:"objectKey"`
	Provider  string `json:"provider"`
	URL       string `json:"url"`
}

func CreateDirectUploadURL(fileName string, contentType string, fileSize int64, purpose string) (*DirectUploadURLResult, error) {
	if resolveProvider("") != "aliyun_oss" {
		return nil, fmt.Errorf("当前上传存储未配置为阿里云 OSS")
	}

	normalizedContentType, extension, err := detectDirectUploadMeta(fileName, contentType)
	if err != nil {
		return nil, err
	}
	if err := validateDirectUploadSize(extension, fileSize); err != nil {
		return nil, err
	}

	objectKey := buildObjectKey("aliyun_oss", purpose, extension)
	bucket, ossConfig, err := getAliyunOSSBucket()
	if err != nil {
		return nil, err
	}

	headers := buildDirectUploadHeaders(normalizedContentType)
	options := buildDirectUploadSignOptions(headers)
	uploadURL, err := bucket.SignURL(objectKey, oss.HTTPPut, directURLExpireInSeconds, options...)
	if err != nil {
		return nil, fmt.Errorf("生成阿里云 OSS 上传地址失败")
	}
	uploadURL = normalizeAliyunSignedURL(uploadURL)

	expiresAt := time.Now().UTC().Add(time.Duration(directURLExpireInSeconds) * time.Second)
	return &DirectUploadURLResult{
		Bucket:    ossConfig.Bucket,
		ExpiresAt: expiresAt.Format(time.RFC3339),
		Headers:   headers,
		Method:    "PUT",
		ObjectKey: objectKey,
		Provider:  "aliyun_oss",
		PublicURL: buildAliyunOSSURL(ossConfig, objectKey),
		UploadURL: uploadURL,
	}, nil
}

func ResolveAccessURL(rawURL string, bucket string, objectKey string, disposition string, fileName string) (*AccessURLResult, error) {
	if strings.TrimSpace(objectKey) != "" {
		ref, err := NormalizeStoredObjectRef(bucket, objectKey, rawURL)
		if err != nil {
			return nil, err
		}

		return signAliyunAccessURL(ref.Bucket, ref.ObjectKey, disposition, fileName)
	}

	trimmedURL := strings.TrimSpace(rawURL)
	if trimmedURL == "" {
		return nil, fmt.Errorf("文件地址不能为空")
	}

	objectKey, provider := resolveAccessObjectKey(trimmedURL)
	if provider != "aliyun_oss" || objectKey == "" {
		return &AccessURLResult{
			ObjectKey: objectKey,
			Provider:  provider,
			URL:       trimmedURL,
		}, nil
	}

	resolvedBucket := strings.TrimSpace(bucket)
	if resolvedBucket == "" {
		resolvedBucket = resolveAliyunOSSBucketName(trimmedURL)
	}
	if resolvedBucket == "" {
		resolvedBucket = strings.TrimSpace(config.Current.Storage.AliyunOSS.Bucket)
	}

	return signAliyunAccessURL(resolvedBucket, objectKey, disposition, fileName)
}

func signAliyunAccessURL(bucketName string, objectKey string, disposition string, fileName string) (*AccessURLResult, error) {
	bucket, ossConfig, err := getAliyunOSSBucketWithName(bucketName)
	if err != nil {
		return nil, err
	}

	options := buildAccessSignOptions(objectKey, disposition, fileName)
	accessURL, err := bucket.SignURL(objectKey, oss.HTTPGet, directURLExpireInSeconds, options...)
	if err != nil {
		return nil, fmt.Errorf("生成阿里云 OSS 访问地址失败")
	}
	accessURL = normalizeAliyunSignedURL(accessURL)

	expiresAt := time.Now().UTC().Add(time.Duration(directURLExpireInSeconds) * time.Second)
	return &AccessURLResult{
		Bucket:    strings.TrimSpace(ossConfig.Bucket),
		ExpiresAt: expiresAt.Format(time.RFC3339),
		ObjectKey: objectKey,
		Provider:  "aliyun_oss",
		URL:       accessURL,
	}, nil
}

func detectDirectUploadMeta(fileName string, rawContentType string) (string, string, error) {
	extension := strings.ToLower(filepath.Ext(strings.TrimSpace(fileName)))
	if extension == "" {
		extensions, _ := mime.ExtensionsByType(strings.TrimSpace(rawContentType))
		if len(extensions) > 0 {
			extension = strings.ToLower(extensions[0])
		}
	}
	if !allowedFileExtensions[extension] {
		return "", "", fmt.Errorf("仅支持 jpg、png、webp、gif、heic 图片和 pdf 文件")
	}

	contentType := strings.TrimSpace(rawContentType)
	if extension == ".pdf" {
		contentType = "application/pdf"
	} else if !strings.HasPrefix(contentType, "image/") {
		contentType = mime.TypeByExtension(extension)
	}
	if contentType == "" {
		return "", "", fmt.Errorf("无法识别文件类型")
	}

	return contentType, extension, nil
}

func validateDirectUploadSize(extension string, fileSize int64) error {
	if fileSize <= 0 {
		return nil
	}

	limit := int64(maxFileSize)
	if allowedImageExtensions[extension] {
		limit = int64(maxImageSize)
	}
	if fileSize > limit {
		if limit == int64(maxImageSize) {
			return fmt.Errorf("图片大小不能超过 10MB")
		}
		return fmt.Errorf("文件大小不能超过 20MB")
	}
	return nil
}

func buildDirectUploadHeaders(contentType string) map[string]string {
	return map[string]string{
		"Content-Type":         contentType,
		"x-oss-forbid-overwrite": "true",
	}
}

func buildDirectUploadSignOptions(headers map[string]string) []oss.Option {
	options := make([]oss.Option, 0, len(headers))
	for key, value := range headers {
		options = append(options, oss.SetHeader(key, value))
	}
	return options
}

func buildAccessSignOptions(objectKey string, disposition string, fileName string) []oss.Option {
	options := []oss.Option{}
	if contentType := mime.TypeByExtension(strings.ToLower(path.Ext(objectKey))); contentType != "" {
		options = append(options, oss.ResponseContentType(contentType))
	}

	resolvedDisposition := normalizeDisposition(disposition)
	if resolvedDisposition == "attachment" {
		resolvedFileName := strings.TrimSpace(fileName)
		if resolvedFileName == "" {
			resolvedFileName = path.Base(objectKey)
		}
		if resolvedFileName != "" {
			options = append(options, oss.ResponseContentDisposition(buildContentDispositionHeader(resolvedDisposition, resolvedFileName)))
		}
	}

	return options
}

func normalizeDisposition(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "attachment":
		return "attachment"
	case "inline":
		return "inline"
	default:
		return ""
	}
}

func buildContentDispositionHeader(disposition string, fileName string) string {
	escapedFileName := url.PathEscape(fileName)
	return fmt.Sprintf("%s; filename*=UTF-8''%s", disposition, escapedFileName)
}

func resolveAccessObjectKey(rawURL string) (string, string) {
	trimmedURL := strings.TrimSpace(rawURL)
	if trimmedURL == "" {
		return "", ""
	}

	if isAliyunOSSObjectKey(trimmedURL) {
		return strings.TrimPrefix(trimmedURL, "/"), "aliyun_oss"
	}

	parsed, err := url.Parse(trimmedURL)
	if err != nil {
		return "", resolveProvider("")
	}

	ossPrefix := strings.TrimRight(strings.TrimSpace(config.Current.Storage.AliyunOSS.BaseURL), "/")
	if ossPrefix != "" && strings.HasPrefix(trimmedURL, ossPrefix+"/") {
		return strings.TrimPrefix(parsed.Path, "/"), "aliyun_oss"
	}

	if isAliyunOSSHost(parsed.Host) {
		return strings.TrimPrefix(parsed.Path, "/"), "aliyun_oss"
	}

	if strings.HasPrefix(parsed.Path, "/uploads/") {
		return strings.TrimPrefix(parsed.Path, "/"), "local"
	}

	return "", resolveProvider("")
}

func isAliyunOSSObjectKey(value string) bool {
	return !strings.Contains(value, "://") && !strings.HasPrefix(value, "/uploads/")
}

func isAliyunOSSHost(host string) bool {
	trimmedHost := strings.TrimSpace(strings.ToLower(host))
	if trimmedHost == "" {
		return false
	}
	if strings.Contains(trimmedHost, ".aliyuncs.com") {
		return true
	}

	ossConfig := config.Current.Storage.AliyunOSS
	if ossConfig.Bucket == "" {
		return false
	}

	endpoint := strings.TrimSpace(ossConfig.Endpoint)
	if endpoint != "" {
		if !strings.Contains(endpoint, "://") {
			endpoint = "https://" + endpoint
		}
		if parsed, err := url.Parse(endpoint); err == nil {
			expectedHost := strings.ToLower(ossConfig.Bucket + "." + parsed.Host)
			if trimmedHost == expectedHost {
				return true
			}
		}
	}

	baseURL := strings.TrimSpace(ossConfig.BaseURL)
	if baseURL != "" {
		if parsed, err := url.Parse(baseURL); err == nil && strings.EqualFold(trimmedHost, parsed.Host) {
			return true
		}
	}

	return false
}

func getAliyunOSSBucket() (*oss.Bucket, config.AliyunOSSConfig, error) {
	return getAliyunOSSBucketWithName("")
}

func getAliyunOSSBucketWithName(bucketName string) (*oss.Bucket, config.AliyunOSSConfig, error) {
	ossConfig := config.Current.Storage.AliyunOSS
	targetBucket := strings.TrimSpace(bucketName)
	if targetBucket == "" {
		targetBucket = strings.TrimSpace(ossConfig.Bucket)
	}
	if ossConfig.Endpoint == "" || targetBucket == "" || ossConfig.AccessKeyID == "" || ossConfig.AccessKeySecret == "" {
		return nil, ossConfig, fmt.Errorf("阿里云 OSS 配置不完整")
	}

	options := []oss.ClientOption{}
	if ossConfig.Region != "" {
		options = append(options, oss.Region(ossConfig.Region), oss.AuthVersion(oss.AuthV4))
	}

	client, err := oss.New(ossConfig.Endpoint, ossConfig.AccessKeyID, ossConfig.AccessKeySecret, options...)
	if err != nil {
		return nil, ossConfig, fmt.Errorf("初始化阿里云 OSS 失败")
	}

	bucket, err := client.Bucket(targetBucket)
	if err != nil {
		return nil, ossConfig, fmt.Errorf("连接阿里云 OSS Bucket 失败")
	}

	ossConfig.Bucket = targetBucket
	return bucket, ossConfig, nil
}

func normalizeAliyunSignedURL(rawURL string) string {
	if strings.TrimSpace(rawURL) == "" {
		return rawURL
	}

	parsed, err := url.Parse(rawURL)
	if err != nil {
		return strings.ReplaceAll(rawURL, "%2F", "/")
	}

	if parsed.Scheme == "" || parsed.Scheme == "http" {
		parsed.Scheme = "https"
	}
	parsed.Path = strings.ReplaceAll(parsed.Path, "%2F", "/")
	parsed.RawPath = strings.ReplaceAll(parsed.RawPath, "%2F", "/")
	return parsed.String()
}
