package studentservice

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Plan struct {
	base.BaseModel
	StudentID        string `gorm:"size:36;index;not null" json:"studentId"`
	PaymentStatus    string `gorm:"size:16;default:unpaid" json:"paymentStatus"`
	PaymentAmount    float64 `gorm:"default:0" json:"paymentAmount"`
	PaidAt           string `gorm:"size:10" json:"paidAt"`
	ServiceStartDate string `gorm:"size:10;index" json:"serviceStartDate"`
	ServiceEndDate   string `gorm:"size:10;index" json:"serviceEndDate"`
	Remark           string `gorm:"size:255" json:"remark"`
}
