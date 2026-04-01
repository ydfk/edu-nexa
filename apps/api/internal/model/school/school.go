package school

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type School struct {
	base.BaseModel
	Name   string `gorm:"size:64;index;not null" json:"name"`
	Status string `gorm:"size:16;default:active" json:"status"`
}
