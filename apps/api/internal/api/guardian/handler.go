package guardian

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianbinding"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type guardianPayload struct {
	GuardianName   string `json:"guardianName"`
	GuardianPhone  string `json:"guardianPhone"`
	GuardianUserID string `json:"guardianUserId"`
	IsPrimary      bool   `json:"isPrimary"`
	Relationship   string `json:"relationship"`
	Status         string `json:"status"`
	StudentID      string `json:"studentId"`
}

func List(c *fiber.Ctx) error {
	var bindings []model.Binding
	query := db.DB.Order("created_at desc")

	if studentID := c.Query("studentId"); studentID != "" {
		query = query.Where("student_id = ?", studentID)
	}
	if guardianPhone := c.Query("guardianPhone"); guardianPhone != "" {
		query = query.Where("guardian_phone = ?", guardianPhone)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&bindings).Error; err != nil {
		return response.Error(c, "查询监护人关系失败")
	}

	return response.Success(c, bindings)
}

func Create(c *fiber.Ctx) error {
	var req guardianPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if req.StudentID == "" || req.GuardianName == "" || req.GuardianPhone == "" {
		return response.Error(c, "学生、监护人姓名和手机号不能为空")
	}

	binding := model.Binding{
		GuardianName:   req.GuardianName,
		GuardianPhone:  req.GuardianPhone,
		GuardianUserID: req.GuardianUserID,
		IsPrimary:      req.IsPrimary,
		Relationship:   req.Relationship,
		Status:         defaultGuardianStatus(req.Status),
		StudentID:      req.StudentID,
	}

	if err := db.DB.Create(&binding).Error; err != nil {
		return response.Error(c, "创建监护人关系失败")
	}

	return response.Success(c, binding)
}

func Update(c *fiber.Ctx) error {
	var req guardianPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var binding model.Binding
	if err := db.DB.First(&binding, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "监护人关系不存在")
	}

	binding.GuardianName = req.GuardianName
	binding.GuardianPhone = req.GuardianPhone
	binding.GuardianUserID = req.GuardianUserID
	binding.IsPrimary = req.IsPrimary
	binding.Relationship = req.Relationship
	binding.Status = defaultGuardianStatus(req.Status)
	binding.StudentID = req.StudentID

	if err := db.DB.Save(&binding).Error; err != nil {
		return response.Error(c, "更新监护人关系失败")
	}

	return response.Success(c, binding)
}

func defaultGuardianStatus(status string) string {
	if status == "" {
		return "active"
	}

	return status
}
