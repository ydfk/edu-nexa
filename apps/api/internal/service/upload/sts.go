package upload

import (
	"fmt"
	"strings"
	"time"

	"github.com/aliyun/credentials-go/credentials"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
)

type AliyunSTSUploadResult struct {
	AccessKeyID     string `json:"accessKeyId"`
	AccessKeySecret string `json:"accessKeySecret"`
	Bucket          string `json:"bucket"`
	Expiration      string `json:"expiration"`
	ObjectKey       string `json:"objectKey"`
	Provider        string `json:"provider"`
	PublicURL       string `json:"publicURL"`
	Region          string `json:"region"`
	SecurityToken   string `json:"securityToken"`
}

func CreateAliyunSTSUpload(fileName string, contentType string, fileSize int64, purpose string, userID string) (*AliyunSTSUploadResult, error) {
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
	return &AliyunSTSUploadResult{
		AccessKeyID:     credential.accessKeyID,
		AccessKeySecret: credential.accessKeySecret,
		Bucket:          ossConfig.Bucket,
		Expiration:      credential.expiration,
		ObjectKey:       objectKey,
		Provider:        "aliyun_oss",
		PublicURL:       buildAliyunOSSURL(ossConfig, objectKey),
		Region:          resolveAliyunOSSBrowserRegion(ossConfig.Region),
		SecurityToken:   credential.securityToken,
	}, nil
}

type aliyunSTSCredential struct {
	accessKeyID     string
	accessKeySecret string
	expiration      string
	securityToken   string
}

func createAliyunSTSCredential(userID string) (*aliyunSTSCredential, config.AliyunOSSConfig, error) {
	ossConfig := config.Current.Storage.AliyunOSS
	if ossConfig.AccessKeyID == "" || ossConfig.AccessKeySecret == "" || ossConfig.Bucket == "" || ossConfig.Region == "" {
		return nil, ossConfig, fmt.Errorf("阿里云 OSS 配置不完整")
	}
	if strings.TrimSpace(ossConfig.STSRoleArn) == "" {
		return nil, ossConfig, fmt.Errorf("阿里云 OSS STS 角色 ARN 未配置")
	}

	credentialConfig := new(credentials.Config).
		SetType("ram_role_arn").
		SetAccessKeyId(ossConfig.AccessKeyID).
		SetAccessKeySecret(ossConfig.AccessKeySecret).
		SetRoleArn(ossConfig.STSRoleArn).
		SetRoleSessionName(buildAliyunSTSSessionName(userID))

	if ossConfig.STSDuration > 0 {
		credentialConfig.SetRoleSessionExpiration(ossConfig.STSDuration)
	}
	if endpoint := resolveAliyunSTSEndpoint(ossConfig); endpoint != "" {
		credentialConfig.SetSTSEndpoint(endpoint)
	}

	provider, err := credentials.NewCredential(credentialConfig)
	if err != nil {
		return nil, ossConfig, fmt.Errorf("初始化阿里云 STS 失败: %v", err)
	}

	result, err := provider.GetCredential()
	if err != nil {
		return nil, ossConfig, fmt.Errorf("获取阿里云 STS 凭证失败: %v", err)
	}

	accessKeyID := dereferenceAliyunCredentialValue(result.AccessKeyId)
	accessKeySecret := dereferenceAliyunCredentialValue(result.AccessKeySecret)
	securityToken := dereferenceAliyunCredentialValue(result.SecurityToken)
	if accessKeyID == "" || accessKeySecret == "" || securityToken == "" {
		return nil, ossConfig, fmt.Errorf("阿里云 STS 返回凭证不完整")
	}
	expiration := time.Now().UTC().Add(time.Duration(resolveAliyunSTSDuration(ossConfig)) * time.Second).Format(time.RFC3339)

	return &aliyunSTSCredential{
		accessKeyID:     accessKeyID,
		accessKeySecret: accessKeySecret,
		expiration:      expiration,
		securityToken:   securityToken,
	}, ossConfig, nil
}

func dereferenceAliyunCredentialValue(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func resolveAliyunOSSBrowserRegion(region string) string {
	trimmed := strings.TrimSpace(region)
	if trimmed == "" {
		return trimmed
	}
	if strings.HasPrefix(trimmed, "oss-") {
		return trimmed
	}
	return "oss-" + trimmed
}

func resolveAliyunSTSEndpoint(ossConfig config.AliyunOSSConfig) string {
	if endpoint := strings.TrimSpace(ossConfig.STSEndpoint); endpoint != "" {
		return endpoint
	}

	region := strings.TrimSpace(ossConfig.Region)
	if region == "" {
		return ""
	}
	return "sts." + strings.TrimPrefix(region, "oss-") + ".aliyuncs.com"
}

func resolveAliyunSTSDuration(ossConfig config.AliyunOSSConfig) int {
	if ossConfig.STSDuration > 0 {
		return ossConfig.STSDuration
	}
	return 3600
}

func buildAliyunSTSSessionName(userID string) string {
	base := strings.TrimSpace(config.Current.Storage.AliyunOSS.STSSessionName)
	if base == "" {
		base = "edunexa-upload"
	}
	if userID == "" {
		return truncateAliyunSTSSessionName(base)
	}

	return truncateAliyunSTSSessionName(base + "-" + sanitizePathSegment(userID))
}

func truncateAliyunSTSSessionName(value string) string {
	trimmed := strings.Trim(strings.TrimSpace(value), "-")
	if trimmed == "" {
		return "edunexa-upload"
	}
	if len(trimmed) <= 64 {
		return trimmed
	}
	return trimmed[:64]
}
