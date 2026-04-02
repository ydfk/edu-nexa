package student

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Student struct {
	base.BaseModel
	CampusID      string `gorm:"size:36;index;not null;default:''" json:"campusId"`
	Name          string `gorm:"size:32;not null" json:"name"`
	SchoolID      string `gorm:"size:36;index" json:"schoolId"`
	SchoolName    string `gorm:"size:64;index" json:"schoolName"`
	ClassID       string `gorm:"size:36;index" json:"classId"`
	ClassName     string `gorm:"size:32;index" json:"className"`
	GradeID       string `gorm:"size:36;index" json:"gradeId"`
	Grade         string `gorm:"size:16;index" json:"grade"`
	GuardianID    string `gorm:"size:36;index" json:"guardianId"`
	GuardianName  string `gorm:"size:32" json:"guardianName"`
	GuardianPhone string `gorm:"size:32" json:"guardianPhone"`
	Status        string `gorm:"size:16;default:active" json:"status"`
}
