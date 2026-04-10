package runtimeconfig

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Config struct {
	base.BaseModel
	Scene               string `gorm:"size:32;uniqueIndex;not null" json:"scene"`
	SystemNamePrefix    string `gorm:"size:64" json:"systemNamePrefix"`
	ImageSecurityEnable bool   `gorm:"default:false" json:"imageSecurityEnable"`
	ImageSecurityStrict bool   `gorm:"default:false" json:"imageSecurityStrict"`
	TextSecurityEnable  bool   `gorm:"default:false" json:"textSecurityEnable"`
	TextSecurityStrict  bool   `gorm:"default:false" json:"textSecurityStrict"`
	HomeworkSubjects    string `gorm:"size:512" json:"homeworkSubjects"`
	PaymentTypes        string `gorm:"size:512" json:"paymentTypes"`
	DemoTeacherName     string `gorm:"size:64" json:"demoTeacherName"`
	DemoTeacherPhone    string `gorm:"size:32" json:"demoTeacherPhone"`
	DemoTeacherPassword string `gorm:"size:128" json:"demoTeacherPassword"`
	DemoGuardianName    string `gorm:"size:64" json:"demoGuardianName"`
	DemoGuardianPhone   string `gorm:"size:32" json:"demoGuardianPhone"`
	DemoGuardianPassword string `gorm:"size:128" json:"demoGuardianPassword"`
}

func (Config) TableName() string {
	return "runtime_configs"
}
