package studentservice

import (
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/studentservice"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type planPayload struct {
	PaymentAmount    float64 `json:"paymentAmount"`
	PaidAt           string  `json:"paidAt"`
	PaymentStatus    string  `json:"paymentStatus"`
	Remark           string  `json:"remark"`
	ServiceEndDate   string  `json:"serviceEndDate"`
	ServiceStartDate string  `json:"serviceStartDate"`
	StudentID        string  `json:"studentId"`
}

func List(c *fiber.Ctx) error {
	var plans []model.Plan
	query := db.DB.Order("service_end_date desc, created_at desc")

	if studentID := strings.TrimSpace(c.Query("studentId")); studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	if paymentStatus := strings.TrimSpace(c.Query("paymentStatus")); paymentStatus != "" {
		query = query.Where("payment_status = ?", paymentStatus)
	}

	if err := query.Find(&plans).Error; err != nil {
		return response.Error(c, "查询服务计划失败")
	}

	return response.Success(c, plans)
}

func Create(c *fiber.Ctx) error {
	var req planPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if strings.TrimSpace(req.StudentID) == "" {
		return response.Error(c, "学生不能为空")
	}

	plan := model.Plan{
		PaymentAmount:    req.PaymentAmount,
		PaidAt:           strings.TrimSpace(req.PaidAt),
		PaymentStatus:    defaultPaymentStatus(req.PaymentStatus),
		Remark:           strings.TrimSpace(req.Remark),
		ServiceEndDate:   strings.TrimSpace(req.ServiceEndDate),
		ServiceStartDate: strings.TrimSpace(req.ServiceStartDate),
		StudentID:        strings.TrimSpace(req.StudentID),
	}

	if err := db.DB.Create(&plan).Error; err != nil {
		return response.Error(c, "创建服务计划失败")
	}

	return response.Success(c, plan)
}

func Update(c *fiber.Ctx) error {
	var req planPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var plan model.Plan
	if err := db.DB.First(&plan, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "服务计划不存在")
	}

	plan.PaymentAmount = req.PaymentAmount
	plan.PaidAt = strings.TrimSpace(req.PaidAt)
	plan.PaymentStatus = defaultPaymentStatus(req.PaymentStatus)
	plan.Remark = strings.TrimSpace(req.Remark)
	plan.ServiceEndDate = strings.TrimSpace(req.ServiceEndDate)
	plan.ServiceStartDate = strings.TrimSpace(req.ServiceStartDate)
	plan.StudentID = strings.TrimSpace(req.StudentID)

	if err := db.DB.Save(&plan).Error; err != nil {
		return response.Error(c, "更新服务计划失败")
	}

	return response.Success(c, plan)
}

func defaultPaymentStatus(status string) string {
	if strings.TrimSpace(status) == "" {
		return "unpaid"
	}

	return strings.TrimSpace(status)
}
