package mealrecord

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Record struct {
	base.BaseModel
	CampusID    string `gorm:"size:36;index;not null;default:''" json:"campusId"`
	StudentID    string `gorm:"size:36;index;not null" json:"studentId"`
	StudentName  string `gorm:"size:32" json:"studentName"`
	ServiceDate  string `gorm:"size:10;index;not null" json:"serviceDate"`
	Status       string `gorm:"size:32;not null" json:"status"`
	Remark       string `gorm:"size:255" json:"remark"`
	ImageURLs    string `gorm:"type:text" json:"imageUrls"`
	RecordedByID string `gorm:"size:36" json:"recordedById"`
	RecordedBy   string `gorm:"size:32" json:"recordedBy"`
}

func (Record) TableName() string {
	return "meal_records"
}
