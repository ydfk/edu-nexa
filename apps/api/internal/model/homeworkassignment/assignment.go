package homeworkassignment

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Assignment struct {
	base.BaseModel
	CampusID    string `gorm:"size:36;index;not null;default:''" json:"campusId"`
	ServiceDate string `gorm:"size:10;index;not null" json:"serviceDate"`
	SchoolName  string `gorm:"size:64;index;not null" json:"schoolName"`
	ClassName   string `gorm:"size:32;index;not null" json:"className"`
	Subject     string `gorm:"size:32;index" json:"subject"`
	Content     string `gorm:"type:text;not null" json:"content"`
	Attachments string `gorm:"type:text" json:"attachments"`
	Remark      string `gorm:"size:255" json:"remark"`
	TeacherID   string `gorm:"size:36" json:"teacherId"`
	TeacherName string `gorm:"size:32" json:"teacherName"`
}
