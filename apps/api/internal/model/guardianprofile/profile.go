package guardianprofile

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Profile struct {
	base.BaseModel
	Name         string `gorm:"size:32;not null" json:"name"`
	Phone        string `gorm:"size:20;index;not null" json:"phone"`
	UserID       string `gorm:"size:36;index" json:"userId"`
	Relationship string `gorm:"size:32" json:"relationship"`
	Remark       string `gorm:"size:255" json:"remark"`
	Status       string `gorm:"size:16;default:active" json:"status"`
}
