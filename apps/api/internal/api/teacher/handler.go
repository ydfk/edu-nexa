package teacher

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/teacherprofile"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type teacherPayload struct {
	Description string `json:"description"`
	Name        string `json:"name"`
	Phone       string `json:"phone"`
	RoleScope   string `json:"roleScope"`
	Status      string `json:"status"`
	UserID      string `json:"userId"`
}

func List(c *fiber.Ctx) error {
	var teachers []model.Profile
	database := db.FromFiber(c)
	query := database.Order("created_at desc")

	if phone := c.Query("phone"); phone != "" {
		query = query.Where("phone = ?", phone)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&teachers).Error; err != nil {
		return response.Error(c, "查询教师失败")
	}

	return response.Success(c, teachers)
}

func Create(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var req teacherPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if req.Name == "" || req.Phone == "" {
		return response.Error(c, "教师姓名和手机号不能为空")
	}

	teacher := model.Profile{
		Description: req.Description,
		Name:        req.Name,
		Phone:       req.Phone,
		RoleScope:   defaultTeacherRole(req.RoleScope),
		Status:      defaultTeacherStatus(req.Status),
		UserID:      req.UserID,
	}

	if err := database.Create(&teacher).Error; err != nil {
		return response.Error(c, "创建教师失败")
	}

	return response.Success(c, teacher)
}

func Update(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var req teacherPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var teacher model.Profile
	if err := database.First(&teacher, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "教师不存在")
	}

	teacher.Description = req.Description
	teacher.Name = req.Name
	teacher.Phone = req.Phone
	teacher.RoleScope = defaultTeacherRole(req.RoleScope)
	teacher.Status = defaultTeacherStatus(req.Status)
	teacher.UserID = req.UserID

	if err := database.Save(&teacher).Error; err != nil {
		return response.Error(c, "更新教师失败")
	}

	return response.Success(c, teacher)
}

func defaultTeacherRole(role string) string {
	if role == "" {
		return "teacher"
	}

	return role
}

func defaultTeacherStatus(status string) string {
	if status == "" {
		return "active"
	}

	return status
}
