package teacherprofile

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Profile struct {
	base.BaseModel
	UserID      string `gorm:"size:36;index" json:"userId"`
	Name        string `gorm:"size:32;not null" json:"name"`
	Phone       string `gorm:"size:20;index;not null" json:"phone"`
	RoleScope   string `gorm:"size:32;default:teacher" json:"roleScope"`
	Status      string `gorm:"size:16;default:active" json:"status"`
	Description string `gorm:"size:255" json:"description"`
}

func (Profile) TableName() string {
	return "teacher_profiles"
}
