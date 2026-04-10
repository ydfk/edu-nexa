package runtimeconfig

import (
	"errors"
	"strings"

	model "github.com/ydfk/edu-nexa/apps/api/internal/model/runtimeconfig"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"gorm.io/gorm"
)

const runtimeScene = "app-runtime"

type Snapshot struct {
	SystemNamePrefix    string `json:"systemNamePrefix"`
	HomeworkSubjects    string `json:"homeworkSubjects"`
	PaymentTypes        string `json:"paymentTypes"`
	ImageSecurityEnable bool   `json:"imageSecurityEnable"`
	ImageSecurityStrict bool   `json:"imageSecurityStrict"`
	Scene               string `json:"scene"`
	TextSecurityEnable  bool   `json:"textSecurityEnable"`
	TextSecurityStrict  bool   `json:"textSecurityStrict"`
	DemoTeacherName     string `json:"demoTeacherName,omitempty"`
	DemoTeacherPhone    string `json:"demoTeacherPhone,omitempty"`
	DemoTeacherPassword string `json:"demoTeacherPassword,omitempty"`
	DemoGuardianName    string `json:"demoGuardianName,omitempty"`
	DemoGuardianPhone   string `json:"demoGuardianPhone,omitempty"`
	DemoGuardianPassword string `json:"demoGuardianPassword,omitempty"`
}

const defaultHomeworkSubjects = `["语文","数学","英语","其他"]`
const defaultPaymentTypes = `["晚餐+晚辅","打印费"]`
const defaultDemoTeacherName = "演示教师"
const defaultDemoTeacherPhone = "18800000001"
const defaultDemoTeacherPassword = "123456"
const defaultDemoGuardianName = "演示家长"
const defaultDemoGuardianPhone = "18800000002"
const defaultDemoGuardianPassword = "123456"

func GetSnapshot() (*Snapshot, error) {
	record, err := getOrCreate()
	if err != nil {
		return nil, err
	}

	return buildSnapshot(record, false), nil
}

func GetAdminSnapshot() (*Snapshot, error) {
	record, err := getOrCreate()
	if err != nil {
		return nil, err
	}

	return buildSnapshot(record, true), nil
}

func SaveSnapshot(snapshot *Snapshot) (*Snapshot, error) {
	record, err := getOrCreate()
	if err != nil {
		return nil, err
	}

	record.SystemNamePrefix = normalizeSystemNamePrefix(snapshot.SystemNamePrefix)
	record.HomeworkSubjects = normalizeHomeworkSubjects(snapshot.HomeworkSubjects)
	record.PaymentTypes = normalizePaymentTypes(snapshot.PaymentTypes)
	record.ImageSecurityEnable = snapshot.ImageSecurityEnable
	record.ImageSecurityStrict = snapshot.ImageSecurityStrict
	record.TextSecurityEnable = snapshot.TextSecurityEnable
	record.TextSecurityStrict = snapshot.TextSecurityStrict
	record.DemoTeacherName = normalizeDemoName(snapshot.DemoTeacherName, defaultDemoTeacherName)
	record.DemoTeacherPhone = normalizeDemoPhone(snapshot.DemoTeacherPhone, defaultDemoTeacherPhone)
	record.DemoTeacherPassword = normalizeDemoPassword(snapshot.DemoTeacherPassword, defaultDemoTeacherPassword)
	record.DemoGuardianName = normalizeDemoName(snapshot.DemoGuardianName, defaultDemoGuardianName)
	record.DemoGuardianPhone = normalizeDemoPhone(snapshot.DemoGuardianPhone, defaultDemoGuardianPhone)
	record.DemoGuardianPassword = normalizeDemoPassword(snapshot.DemoGuardianPassword, defaultDemoGuardianPassword)

	if err := db.DB.Save(record).Error; err != nil {
		return nil, err
	}

	return GetAdminSnapshot()
}

func getOrCreate() (*model.Config, error) {
	var record model.Config
	if err := db.DB.First(&record, "scene = ?", runtimeScene).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		record = model.Config{
			Scene: runtimeScene,
		}
		if err := db.DB.Create(&record).Error; err != nil {
			return nil, err
		}
	}

	return &record, nil
}

func IsDemoPhone(phone string) (bool, error) {
	if !db.DB.Migrator().HasTable(&model.Config{}) {
		return false, nil
	}

	record, err := getOrCreate()
	if err != nil {
		return false, err
	}

	trimmed := strings.TrimSpace(phone)
	if trimmed == "" {
		return false, nil
	}

	return trimmed == normalizeDemoPhone(record.DemoTeacherPhone, defaultDemoTeacherPhone) ||
		trimmed == normalizeDemoPhone(record.DemoGuardianPhone, defaultDemoGuardianPhone), nil
}

func buildSnapshot(record *model.Config, includeDemo bool) *Snapshot {
	snapshot := &Snapshot{
		SystemNamePrefix:    normalizeSystemNamePrefix(record.SystemNamePrefix),
		HomeworkSubjects:    normalizeHomeworkSubjects(record.HomeworkSubjects),
		PaymentTypes:        normalizePaymentTypes(record.PaymentTypes),
		ImageSecurityEnable: record.ImageSecurityEnable,
		ImageSecurityStrict: record.ImageSecurityStrict,
		Scene:               record.Scene,
		TextSecurityEnable:  record.TextSecurityEnable,
		TextSecurityStrict:  record.TextSecurityStrict,
	}
	if includeDemo {
		snapshot.DemoTeacherName = normalizeDemoName(record.DemoTeacherName, defaultDemoTeacherName)
		snapshot.DemoTeacherPhone = normalizeDemoPhone(record.DemoTeacherPhone, defaultDemoTeacherPhone)
		snapshot.DemoTeacherPassword = normalizeDemoPassword(record.DemoTeacherPassword, defaultDemoTeacherPassword)
		snapshot.DemoGuardianName = normalizeDemoName(record.DemoGuardianName, defaultDemoGuardianName)
		snapshot.DemoGuardianPhone = normalizeDemoPhone(record.DemoGuardianPhone, defaultDemoGuardianPhone)
		snapshot.DemoGuardianPassword = normalizeDemoPassword(record.DemoGuardianPassword, defaultDemoGuardianPassword)
	}

	return snapshot
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

func normalizePaymentTypes(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || trimmed == "[]" {
		return defaultPaymentTypes
	}
	return trimmed
}

func normalizeDemoName(name string, fallback string) string {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return fallback
	}

	return trimmed
}

func normalizeDemoPhone(phone string, fallback string) string {
	trimmed := strings.TrimSpace(phone)
	if trimmed == "" {
		return fallback
	}

	return trimmed
}

func normalizeDemoPassword(password string, fallback string) string {
	trimmed := strings.TrimSpace(password)
	if trimmed == "" {
		return fallback
	}

	return trimmed
}
