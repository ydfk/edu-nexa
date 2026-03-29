package student

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Student struct {
	base.BaseModel
	CampusID      string `gorm:"size:36;index;not null" json:"campusId"`
	Name          string `gorm:"size:32;not null" json:"name"`
	SchoolName    string `gorm:"size:64" json:"schoolName"`
	Grade         string `gorm:"size:16" json:"grade"`
	GuardianName  string `gorm:"size:32" json:"guardianName"`
	GuardianPhone string `gorm:"size:32" json:"guardianPhone"`
	Status        string `gorm:"size:16;default:active" json:"status"`
}
