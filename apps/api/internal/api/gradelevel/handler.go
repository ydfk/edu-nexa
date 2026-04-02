package gradelevel

import (
	"errors"
	"strconv"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	classgroupModel "github.com/ydfk/edu-nexa/apps/api/internal/model/classgroup"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/gradelevel"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type gradePayload struct {
	Name   string `json:"name"`
	Sort   int    `json:"sort"`
	Status string `json:"status"`
}

func List(c *fiber.Ctx) error {
	var items []model.Grade
	query := db.DB.Order("sort asc, created_at desc")

	if keyword := strings.TrimSpace(c.Query("keyword")); keyword != "" {
		query = query.Where("name LIKE ?", "%"+keyword+"%")
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&items).Error; err != nil {
		return response.Error(c, "查询年级失败")
	}

	return response.Success(c, items)
}

func Create(c *fiber.Ctx) error {
	var req gradePayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if strings.TrimSpace(req.Name) == "" {
		return response.Error(c, "年级名称不能为空")
	}
	if err := ensureGradeNameUnique(strings.TrimSpace(req.Name), ""); err != nil {
		return response.Error(c, err.Error())
	}

	item := model.Grade{
		Name:   strings.TrimSpace(req.Name),
		Sort:   req.Sort,
		Status: defaultGradeStatus(req.Status),
	}
	if err := db.DB.Create(&item).Error; err != nil {
		return response.Error(c, "创建年级失败")
	}

	return response.Success(c, item)
}

func Update(c *fiber.Ctx) error {
	var req gradePayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var item model.Grade
	if err := db.DB.First(&item, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "年级不存在")
	}
	if strings.TrimSpace(req.Name) == "" {
		return response.Error(c, "年级名称不能为空")
	}
	if err := ensureGradeNameUnique(strings.TrimSpace(req.Name), item.Id.String()); err != nil {
		return response.Error(c, err.Error())
	}

	item.Name = strings.TrimSpace(req.Name)
	item.Sort = req.Sort
	item.Status = defaultGradeStatus(req.Status)
	if err := db.DB.Save(&item).Error; err != nil {
		return response.Error(c, "更新年级失败")
	}

	return response.Success(c, item)
}

func Delete(c *fiber.Ctx) error {
	var item model.Grade
	if err := db.DB.First(&item, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "年级不存在")
	}
	if err := ensureGradeDeletable(item); err != nil {
		return response.Error(c, err.Error())
	}

	if err := db.DB.Delete(&item).Error; err != nil {
		return response.Error(c, "删除年级失败")
	}

	return response.Success(c, fiber.Map{"id": item.Id})
}

func defaultGradeStatus(status string) string {
	if strings.TrimSpace(status) == "" {
		return "active"
	}

	return strings.TrimSpace(status)
}

func ParseSort(raw string) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return 0
	}

	return value
}

func ensureGradeNameUnique(name string, excludeID string) error {
	var item model.Grade
	query := db.DB.Where("LOWER(name) = LOWER(?)", strings.TrimSpace(name))
	if excludeID != "" {
		query = query.Where("id <> ?", excludeID)
	}

	if err := query.First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return errors.New("年级名称校验失败")
	}

	return errors.New("年级名称已存在")
}

func ensureGradeDeletable(item model.Grade) error {
	var count int64
	if err := db.DB.Model(&classgroupModel.Class{}).Where("grade_id = ?", item.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验年级关联班级失败")
	}
	if count > 0 {
		return errors.New("年级下存在班级，不能删除")
	}

	if err := db.DB.Model(&studentModel.Student{}).Where("grade_id = ?", item.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验年级关联学生失败")
	}
	if count > 0 {
		return errors.New("年级下存在学生，不能删除")
	}

	return nil
}
