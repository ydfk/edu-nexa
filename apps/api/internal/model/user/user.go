package user

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type User struct {
	base.BaseModel
	DisplayName string `gorm:"size:64" json:"displayName"`
	Phone       string `gorm:"uniqueIndex;size:20;not null" json:"phone" example:"13800000000"`
	Roles       string `gorm:"size:128" json:"roles"`
	Password    string `json:"-"`
}
