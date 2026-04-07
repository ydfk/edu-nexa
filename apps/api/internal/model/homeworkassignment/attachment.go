package homeworkassignment

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Attachment struct {
	base.BaseModel
	AssignmentID string `gorm:"size:36;index;not null" json:"assignmentId"`
	Sort         int    `gorm:"not null;default:0" json:"sort"`
	Bucket       string `gorm:"size:128;not null" json:"bucket"`
	Name         string `gorm:"size:255;not null;default:''" json:"name"`
	Extension    string `gorm:"size:32;not null;default:''" json:"extension"`
	ObjectKey    string `gorm:"size:512;not null" json:"objectKey"`
	Size         int64  `gorm:"not null;default:0" json:"size"`
}

func (Attachment) TableName() string {
	return "homework_assignment_attachments"
}
