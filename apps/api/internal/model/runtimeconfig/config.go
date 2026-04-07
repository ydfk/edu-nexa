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
}

func (Config) TableName() string {
	return "runtime_configs"
}
