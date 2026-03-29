package homeworkrecord

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Record struct {
	base.BaseModel
	CampusID     string `gorm:"size:36;index;not null" json:"campusId"`
	StudentID    string `gorm:"size:36;index;not null" json:"studentId"`
	ServiceDate  string `gorm:"size:10;index;not null" json:"serviceDate"`
	Status       string `gorm:"size:32;not null" json:"status"`
	Remark       string `gorm:"size:255" json:"remark"`
	RecordedByID string `gorm:"size:36" json:"recordedById"`
	RecordedBy   string `gorm:"size:32" json:"recordedBy"`
}
