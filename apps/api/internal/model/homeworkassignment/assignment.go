package homeworkassignment

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Assignment struct {
	base.BaseModel
	ServiceDate string `gorm:"size:10;index;not null" json:"serviceDate"`
	SchoolName  string `gorm:"size:64;index;not null" json:"schoolName"`
	ClassName   string `gorm:"size:32;index;not null" json:"className"`
	Content     string `gorm:"type:text;not null" json:"content"`
	Remark      string `gorm:"size:255" json:"remark"`
	TeacherID   string `gorm:"size:36" json:"teacherId"`
	TeacherName string `gorm:"size:32" json:"teacherName"`
}
