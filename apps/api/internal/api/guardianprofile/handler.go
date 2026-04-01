package guardianprofile

import (
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianprofile"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type guardianPayload struct {
	Name         string `json:"name"`
	Phone        string `json:"phone"`
	Relationship string `json:"relationship"`
	Remark       string `json:"remark"`
	Status       string `json:"status"`
}

func List(c *fiber.Ctx) error {
	var items []model.Profile
	query := db.DB.Order("created_at desc")

	if keyword := strings.TrimSpace(c.Query("keyword")); keyword != "" {
		query = query.Where("name LIKE ? OR phone LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&items).Error; err != nil {
		return response.Error(c, "查询监护人失败")
	}

	return response.Success(c, items)
}

func Create(c *fiber.Ctx) error {
	var req guardianPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Phone) == "" {
		return response.Error(c, "监护人姓名和手机号不能为空")
	}

	item := model.Profile{
		Name:         strings.TrimSpace(req.Name),
		Phone:        strings.TrimSpace(req.Phone),
		Relationship: strings.TrimSpace(req.Relationship),
		Remark:       strings.TrimSpace(req.Remark),
		Status:       defaultGuardianStatus(req.Status),
	}
	if err := db.DB.Create(&item).Error; err != nil {
		return response.Error(c, "创建监护人失败")
	}

	return response.Success(c, item)
}

func Update(c *fiber.Ctx) error {
	var req guardianPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var item model.Profile
	if err := db.DB.First(&item, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "监护人不存在")
	}

	item.Name = strings.TrimSpace(req.Name)
	item.Phone = strings.TrimSpace(req.Phone)
	item.Relationship = strings.TrimSpace(req.Relationship)
	item.Remark = strings.TrimSpace(req.Remark)
	item.Status = defaultGuardianStatus(req.Status)
	if err := db.DB.Save(&item).Error; err != nil {
		return response.Error(c, "更新监护人失败")
	}

	return response.Success(c, item)
}

func defaultGuardianStatus(status string) string {
	if strings.TrimSpace(status) == "" {
		return "active"
	}

	return strings.TrimSpace(status)
}
