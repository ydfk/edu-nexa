package classgroup

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Class struct {
	base.BaseModel
	SchoolID   string `gorm:"size:36;index" json:"schoolId"`
	SchoolName string `gorm:"size:64;index" json:"schoolName"`
	GradeID    string `gorm:"size:36;index" json:"gradeId"`
	GradeName  string `gorm:"size:32;index" json:"gradeName"`
	Name       string `gorm:"size:32;index;not null" json:"name"`
	Sort       int    `gorm:"default:0" json:"sort"`
	Status     string `gorm:"size:16;default:active" json:"status"`
}
