package runtimeconfig

import (
	"errors"

	model "github.com/ydfk/edu-nexa/apps/api/internal/model/runtimeconfig"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"gorm.io/gorm"
)

const runtimeScene = "app-runtime"

type Snapshot struct {
	ImageSecurityEnable bool   `json:"imageSecurityEnable"`
	ImageSecurityStrict bool   `json:"imageSecurityStrict"`
	Scene               string `json:"scene"`
	TextSecurityEnable  bool   `json:"textSecurityEnable"`
	TextSecurityStrict  bool   `json:"textSecurityStrict"`
	UploadProvider      string `json:"uploadProvider"`
}

func GetSnapshot() (*Snapshot, error) {
	record, err := getOrCreate()
	if err != nil {
		return nil, err
	}

	return &Snapshot{
		ImageSecurityEnable: record.ImageSecurityEnable,
		ImageSecurityStrict: record.ImageSecurityStrict,
		Scene:               record.Scene,
		TextSecurityEnable:  record.TextSecurityEnable,
		TextSecurityStrict:  record.TextSecurityStrict,
		UploadProvider:      normalizeProvider(record.UploadProvider),
	}, nil
}

func SaveSnapshot(snapshot *Snapshot) (*Snapshot, error) {
	record, err := getOrCreate()
	if err != nil {
		return nil, err
	}

	record.ImageSecurityEnable = snapshot.ImageSecurityEnable
	record.ImageSecurityStrict = snapshot.ImageSecurityStrict
	record.TextSecurityEnable = snapshot.TextSecurityEnable
	record.TextSecurityStrict = snapshot.TextSecurityStrict
	record.UploadProvider = normalizeProvider(snapshot.UploadProvider)

	if err := db.DB.Save(record).Error; err != nil {
		return nil, err
	}

	return GetSnapshot()
}

func getOrCreate() (*model.Config, error) {
	var record model.Config
	if err := db.DB.First(&record, "scene = ?", runtimeScene).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		record = model.Config{
			Scene:          runtimeScene,
			UploadProvider: normalizeProvider(config.Current.Storage.DefaultProvider),
		}
		if err := db.DB.Create(&record).Error; err != nil {
			return nil, err
		}
	}

	record.UploadProvider = normalizeProvider(record.UploadProvider)
	return &record, nil
}

func normalizeProvider(provider string) string {
	switch provider {
	case "aliyun_oss", "upyun", "local":
		return provider
	}

	switch config.Current.Storage.DefaultProvider {
	case "aliyun_oss", "upyun", "local":
		return config.Current.Storage.DefaultProvider
	default:
		return "local"
	}
}
