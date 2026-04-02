package paymentrecord

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/paymentrecord"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	"github.com/ydfk/edu-nexa/apps/api/internal/service"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
)

type paymentPayload struct {
	StudentID       string  `json:"studentId"`
	PaymentType     string  `json:"paymentType"`
	PaymentAmount   float64 `json:"paymentAmount"`
	PeriodStartDate string  `json:"periodStartDate"`
	PeriodEndDate   string  `json:"periodEndDate"`
	PaidAt          string  `json:"paidAt"`
	Remark          string  `json:"remark"`
	RefundAmount    float64 `json:"refundAmount"`
	RefundedAt      string  `json:"refundedAt"`
	RefundRemark    string  `json:"refundRemark"`
}

func List(c *fiber.Ctx) error {
	var items []model.Record
	query := db.DB.Order("paid_at desc, created_at desc")

	if studentID := strings.TrimSpace(c.Query("studentId")); studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	if paymentType := strings.TrimSpace(c.Query("paymentType")); paymentType != "" {
		query = query.Where("payment_type = ?", paymentType)
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}
	if dateFrom := strings.TrimSpace(c.Query("dateFrom")); dateFrom != "" {
		query = query.Where("paid_at >= ?", dateFrom)
	}
	if dateTo := strings.TrimSpace(c.Query("dateTo")); dateTo != "" {
		query = query.Where("paid_at <= ?", dateTo)
	}

	if err := query.Find(&items).Error; err != nil {
		return response.Error(c, "查询缴费记录失败")
	}

	return response.Success(c, items)
}

func Create(c *fiber.Ctx) error {
	var req paymentPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if err := validatePaymentPayload(req); err != nil {
		return response.Error(c, err.Error())
	}

	student, err := findStudent(req.StudentID, "")
	if err != nil {
		return response.Error(c, err.Error())
	}

	item := model.Record{
		StudentID:       student.Id.String(),
		StudentName:     student.Name,
		SchoolID:        student.SchoolID,
		SchoolName:      student.SchoolName,
		GradeID:         student.GradeID,
		GradeName:       student.Grade,
		ClassID:         student.ClassID,
		ClassName:       student.ClassName,
		GuardianID:      student.GuardianID,
		GuardianName:    student.GuardianName,
		GuardianPhone:   student.GuardianPhone,
		PaymentType:     strings.TrimSpace(req.PaymentType),
		PaymentAmount:   req.PaymentAmount,
		PeriodStartDate: strings.TrimSpace(req.PeriodStartDate),
		PeriodEndDate:   strings.TrimSpace(req.PeriodEndDate),
		PaidAt:          strings.TrimSpace(req.PaidAt),
		Remark:          strings.TrimSpace(req.Remark),
		RefundAmount:    req.RefundAmount,
		RefundedAt:      strings.TrimSpace(req.RefundedAt),
		RefundRemark:    strings.TrimSpace(req.RefundRemark),
	}
	item.Status = buildPaymentStatus(item.PaymentAmount, item.RefundAmount)

	if err := db.DB.Create(&item).Error; err != nil {
		return response.Error(c, "创建缴费记录失败")
	}

	return response.Success(c, item)
}

func Update(c *fiber.Ctx) error {
	var req paymentPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if err := validatePaymentPayload(req); err != nil {
		return response.Error(c, err.Error())
	}

	var item model.Record
	if err := db.DB.First(&item, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "缴费记录不存在")
	}

	student, err := findStudent(req.StudentID, item.StudentID)
	if err != nil {
		return response.Error(c, err.Error())
	}

	item.StudentID = student.Id.String()
	item.StudentName = student.Name
	item.SchoolID = student.SchoolID
	item.SchoolName = student.SchoolName
	item.GradeID = student.GradeID
	item.GradeName = student.Grade
	item.ClassID = student.ClassID
	item.ClassName = student.ClassName
	item.GuardianID = student.GuardianID
	item.GuardianName = student.GuardianName
	item.GuardianPhone = student.GuardianPhone
	item.PaymentType = strings.TrimSpace(req.PaymentType)
	item.PaymentAmount = req.PaymentAmount
	item.PeriodStartDate = strings.TrimSpace(req.PeriodStartDate)
	item.PeriodEndDate = strings.TrimSpace(req.PeriodEndDate)
	item.PaidAt = strings.TrimSpace(req.PaidAt)
	item.Remark = strings.TrimSpace(req.Remark)
	item.RefundAmount = req.RefundAmount
	item.RefundedAt = strings.TrimSpace(req.RefundedAt)
	item.RefundRemark = strings.TrimSpace(req.RefundRemark)
	item.Status = buildPaymentStatus(item.PaymentAmount, item.RefundAmount)

	if err := db.DB.Save(&item).Error; err != nil {
		return response.Error(c, "更新缴费记录失败")
	}

	return response.Success(c, item)
}

func Delete(c *fiber.Ctx) error {
	var item model.Record
	if err := db.DB.First(&item, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "缴费记录不存在")
	}

	if err := db.DB.Delete(&item).Error; err != nil {
		return response.Error(c, "删除缴费记录失败")
	}

	return response.Success(c, fiber.Map{"id": item.Id})
}

func validatePaymentPayload(req paymentPayload) error {
	if strings.TrimSpace(req.StudentID) == "" {
		return errors.New("学生不能为空")
	}
	if strings.TrimSpace(req.PaymentType) == "" {
		return errors.New("缴费类型不能为空")
	}
	if req.PaymentAmount <= 0 {
		return errors.New("缴费金额必须大于 0")
	}
	if strings.TrimSpace(req.PaidAt) == "" {
		return errors.New("缴费日期不能为空")
	}
	if strings.TrimSpace(req.PeriodStartDate) == "" || strings.TrimSpace(req.PeriodEndDate) == "" {
		return errors.New("缴费周期不能为空")
	}
	if strings.TrimSpace(req.PeriodEndDate) < strings.TrimSpace(req.PeriodStartDate) {
		return errors.New("缴费周期结束日期不能早于开始日期")
	}
	if req.RefundAmount < 0 {
		return errors.New("退费金额不能小于 0")
	}
	if req.RefundAmount > req.PaymentAmount {
		return errors.New("退费金额不能大于缴费金额")
	}
	if req.RefundAmount > 0 && strings.TrimSpace(req.RefundedAt) == "" {
		return errors.New("退费日期不能为空")
	}
	if req.RefundAmount == 0 && (strings.TrimSpace(req.RefundedAt) != "" || strings.TrimSpace(req.RefundRemark) != "") {
		return errors.New("请先填写退费金额")
	}

	return nil
}

func findStudent(studentID string, currentStudentID string) (*studentModel.Student, error) {
	var item studentModel.Student
	if err := db.DB.First(&item, "id = ?", strings.TrimSpace(studentID)).Error; err != nil {
		return nil, errors.New("学生不存在")
	}
	if strings.TrimSpace(currentStudentID) != item.Id.String() && !service.IsActiveStatus(item.Status) {
		return nil, errors.New("学生已禁用")
	}
	return &item, nil
}

func buildPaymentStatus(paymentAmount float64, refundAmount float64) string {
	if refundAmount <= 0 {
		return "paid"
	}
	if refundAmount >= paymentAmount {
		return "refunded"
	}
	return "partial_refunded"
}
