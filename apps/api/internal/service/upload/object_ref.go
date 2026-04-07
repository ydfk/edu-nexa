package upload

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
)

type StoredObjectRef struct {
	Bucket    string
	ObjectKey string
	Provider  string
}

func NormalizeStoredObjectRef(bucket string, objectKey string, rawURL string) (StoredObjectRef, error) {
	normalizedBucket := strings.TrimSpace(bucket)
	normalizedObjectKey := strings.Trim(strings.TrimSpace(objectKey), "/")
	if normalizedObjectKey != "" {
		if normalizedBucket == "" {
			normalizedBucket = strings.TrimSpace(config.Current.Storage.AliyunOSS.Bucket)
		}
		if normalizedBucket == "" {
			return StoredObjectRef{}, fmt.Errorf("附件存储 Bucket 未配置")
		}

		return StoredObjectRef{
			Bucket:    normalizedBucket,
			ObjectKey: normalizedObjectKey,
			Provider:  "aliyun_oss",
		}, nil
	}

	trimmedURL := strings.TrimSpace(rawURL)
	if trimmedURL == "" {
		return StoredObjectRef{}, fmt.Errorf("附件地址不能为空")
	}

	resolvedObjectKey, provider := resolveAccessObjectKey(trimmedURL)
	if provider != "aliyun_oss" || resolvedObjectKey == "" {
		return StoredObjectRef{}, fmt.Errorf("仅支持阿里云 OSS 附件")
	}

	if normalizedBucket == "" {
		normalizedBucket = resolveAliyunOSSBucketName(trimmedURL)
	}
	if normalizedBucket == "" {
		normalizedBucket = strings.TrimSpace(config.Current.Storage.AliyunOSS.Bucket)
	}
	if normalizedBucket == "" {
		return StoredObjectRef{}, fmt.Errorf("附件存储 Bucket 未配置")
	}

	return StoredObjectRef{
		Bucket:    normalizedBucket,
		ObjectKey: resolvedObjectKey,
		Provider:  provider,
	}, nil
}

func resolveAliyunOSSBucketName(rawURL string) string {
	trimmedURL := strings.TrimSpace(rawURL)
	if trimmedURL == "" {
		return ""
	}
	if !strings.Contains(trimmedURL, "://") {
		return strings.TrimSpace(config.Current.Storage.AliyunOSS.Bucket)
	}

	parsed, err := url.Parse(trimmedURL)
	if err != nil {
		return ""
	}

	host := strings.ToLower(strings.TrimSpace(parsed.Hostname()))
	if host == "" {
		return ""
	}

	baseURL := strings.TrimSpace(config.Current.Storage.AliyunOSS.BaseURL)
	if baseURL != "" {
		if parsedBaseURL, err := url.Parse(baseURL); err == nil && strings.EqualFold(host, parsedBaseURL.Hostname()) {
			return strings.TrimSpace(config.Current.Storage.AliyunOSS.Bucket)
		}
	}

	if !strings.Contains(host, ".aliyuncs.com") {
		return ""
	}

	parts := strings.Split(host, ".")
	if len(parts) == 0 {
		return ""
	}

	return strings.TrimSpace(parts[0])
}
