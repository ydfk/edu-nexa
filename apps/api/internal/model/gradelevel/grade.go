package gradelevel

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Grade struct {
	base.BaseModel
	Name   string `gorm:"size:32;index;not null" json:"name"`
	Sort   int    `gorm:"default:0" json:"sort"`
	Status string `gorm:"size:16;default:active" json:"status"`
}
