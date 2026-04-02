package runtimeconfig

import (
	"errors"
	"strings"

	model "github.com/ydfk/edu-nexa/apps/api/internal/model/runtimeconfig"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"gorm.io/gorm"
)

const runtimeScene = "app-runtime"

type Snapshot struct {
	SystemNamePrefix    string `json:"systemNamePrefix"`
	HomeworkSubjects    string `json:"homeworkSubjects"`
	ImageSecurityEnable bool   `json:"imageSecurityEnable"`
	ImageSecurityStrict bool   `json:"imageSecurityStrict"`
	Scene               string `json:"scene"`
	TextSecurityEnable  bool   `json:"textSecurityEnable"`
	TextSecurityStrict  bool   `json:"textSecurityStrict"`
	UploadProvider      string `json:"uploadProvider"`
}

const defaultHomeworkSubjects = `["语文","数学","英语","其他"]`

func GetSnapshot() (*Snapshot, error) {
	record, err := getOrCreate()
	if err != nil {
		return nil, err
	}

	return &Snapshot{
		SystemNamePrefix:    normalizeSystemNamePrefix(record.SystemNamePrefix),
		HomeworkSubjects:    normalizeHomeworkSubjects(record.HomeworkSubjects),
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

	record.SystemNamePrefix = normalizeSystemNamePrefix(snapshot.SystemNamePrefix)
	record.HomeworkSubjects = normalizeHomeworkSubjects(snapshot.HomeworkSubjects)
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

func normalizeSystemNamePrefix(prefix string) string {
	return strings.TrimSpace(prefix)
}

func normalizeHomeworkSubjects(subjects string) string {
	trimmed := strings.TrimSpace(subjects)
	if trimmed == "" || trimmed == "[]" {
		return defaultHomeworkSubjects
	}
	return trimmed
}
