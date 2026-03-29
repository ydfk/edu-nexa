package campus

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Campus struct {
	base.BaseModel
	Name           string `gorm:"size:64;not null" json:"name"`
	Code           string `gorm:"size:32;uniqueIndex;not null" json:"code"`
	ContactPerson  string `gorm:"size:32" json:"contactPerson"`
	ContactPhone   string `gorm:"size:32" json:"contactPhone"`
	Address        string `gorm:"size:255" json:"address"`
	ServiceStartAt string `gorm:"size:8" json:"serviceStartAt"`
	ServiceEndAt   string `gorm:"size:8" json:"serviceEndAt"`
	Status         string `gorm:"size:16;default:active" json:"status"`
}
