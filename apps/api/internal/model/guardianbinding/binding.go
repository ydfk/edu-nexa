package guardianbinding

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Binding struct {
	base.BaseModel
	StudentID      string `gorm:"size:36;index;not null" json:"studentId"`
	GuardianUserID string `gorm:"size:36;index" json:"guardianUserId"`
	GuardianName   string `gorm:"size:32;not null" json:"guardianName"`
	GuardianPhone  string `gorm:"size:20;index;not null" json:"guardianPhone"`
	Relationship   string `gorm:"size:16" json:"relationship"`
	IsPrimary      bool   `gorm:"default:false" json:"isPrimary"`
	Status         string `gorm:"size:16;default:active" json:"status"`
}
