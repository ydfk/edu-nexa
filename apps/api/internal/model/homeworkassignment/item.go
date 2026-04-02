package homeworkassignment

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Item struct {
	base.BaseModel
	AssignmentID string `gorm:"size:36;index;not null" json:"assignmentId"`
	Sort         int    `gorm:"not null;default:0" json:"sort"`
	Content      string `gorm:"type:text;not null" json:"content"`
}

func (Item) TableName() string {
	return "homework_assignment_items"
}
