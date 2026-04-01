package homeworkrecord

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Record struct {
	base.BaseModel
	StudentID      string `gorm:"size:36;index;not null" json:"studentId"`
	StudentName    string `gorm:"size:32" json:"studentName"`
	SchoolName     string `gorm:"size:64;index" json:"schoolName"`
	ClassName      string `gorm:"size:32;index" json:"className"`
	ServiceDate    string `gorm:"size:10;index;not null" json:"serviceDate"`
	Status         string `gorm:"size:32;not null" json:"status"`
	SubjectSummary string `gorm:"size:128" json:"subjectSummary"`
	Remark         string `gorm:"size:255" json:"remark"`
	ImageURLs      string `gorm:"type:text" json:"imageUrls"`
	RecordedByID   string `gorm:"size:36" json:"recordedById"`
	RecordedBy     string `gorm:"size:32" json:"recordedBy"`
}
