package paymentrecord

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Record struct {
	base.BaseModel
	StudentID        string  `gorm:"size:36;index;not null" json:"studentId"`
	StudentName      string  `gorm:"size:32;index;not null" json:"studentName"`
	SchoolID         string  `gorm:"size:36;index" json:"schoolId"`
	SchoolName       string  `gorm:"size:64;index" json:"schoolName"`
	GradeID          string  `gorm:"size:36;index" json:"gradeId"`
	GradeName        string  `gorm:"size:32;index" json:"gradeName"`
	ClassID          string  `gorm:"size:36;index" json:"classId"`
	ClassName        string  `gorm:"size:32;index" json:"className"`
	GuardianID       string  `gorm:"size:36;index" json:"guardianId"`
	GuardianName     string  `gorm:"size:32" json:"guardianName"`
	GuardianPhone    string  `gorm:"size:32" json:"guardianPhone"`
	PaymentType      string  `gorm:"size:64;index;not null" json:"paymentType"`
	PaymentAmount    float64 `gorm:"default:0" json:"paymentAmount"`
	PeriodStartDate  string  `gorm:"size:10;index" json:"periodStartDate"`
	PeriodEndDate    string  `gorm:"size:10;index" json:"periodEndDate"`
	PaidAt           string  `gorm:"size:10;index" json:"paidAt"`
	Remark           string  `gorm:"size:255" json:"remark"`
	RefundAmount     float64 `gorm:"default:0" json:"refundAmount"`
	RefundedAt       string  `gorm:"size:10;index" json:"refundedAt"`
	RefundRemark     string  `gorm:"size:255" json:"refundRemark"`
	Status           string  `gorm:"size:24;index;default:paid" json:"status"`
}

func (Record) TableName() string {
	return "payment_records"
}
