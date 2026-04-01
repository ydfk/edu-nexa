package school

import (
	"errors"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/school"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type schoolPayload struct {
	Name   string `json:"name"`
	Status string `json:"status"`
}

func List(c *fiber.Ctx) error {
	var items []model.School
	query := db.DB.Order("created_at desc")

	if keyword := strings.TrimSpace(c.Query("keyword")); keyword != "" {
		query = query.Where("name LIKE ?", "%"+keyword+"%")
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&items).Error; err != nil {
		return response.Error(c, "查询学校失败")
	}

	return response.Success(c, items)
}

func Create(c *fiber.Ctx) error {
	var req schoolPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if strings.TrimSpace(req.Name) == "" {
		return response.Error(c, "学校名称不能为空")
	}
	if err := ensureSchoolNameUnique(strings.TrimSpace(req.Name), ""); err != nil {
		return response.Error(c, err.Error())
	}

	item := model.School{
		Name:   strings.TrimSpace(req.Name),
		Status: defaultStatus(req.Status),
	}
	if err := db.DB.Create(&item).Error; err != nil {
		return response.Error(c, "创建学校失败")
	}

	return response.Success(c, item)
}

func Update(c *fiber.Ctx) error {
	var req schoolPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var item model.School
	if err := db.DB.First(&item, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "学校不存在")
	}
	if strings.TrimSpace(req.Name) == "" {
		return response.Error(c, "学校名称不能为空")
	}
	if err := ensureSchoolNameUnique(strings.TrimSpace(req.Name), item.Id.String()); err != nil {
		return response.Error(c, err.Error())
	}

	item.Name = strings.TrimSpace(req.Name)
	item.Status = defaultStatus(req.Status)
	if err := db.DB.Save(&item).Error; err != nil {
		return response.Error(c, "更新学校失败")
	}

	return response.Success(c, item)
}

func defaultStatus(status string) string {
	if strings.TrimSpace(status) == "" {
		return "active"
	}

	return strings.TrimSpace(status)
}

func ensureSchoolNameUnique(name string, excludeID string) error {
	var item model.School
	query := db.DB.Where("LOWER(name) = LOWER(?)", strings.TrimSpace(name))
	if excludeID != "" {
		query = query.Where("id <> ?", excludeID)
	}

	if err := query.First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return errors.New("学校名称校验失败")
	}

	return errors.New("学校名称已存在")
}
