package campus

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/campus"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type campusPayload struct {
	Address        string `json:"address"`
	Code           string `json:"code"`
	ContactPerson  string `json:"contactPerson"`
	ContactPhone   string `json:"contactPhone"`
	Name           string `json:"name"`
	ServiceEndAt   string `json:"serviceEndAt"`
	ServiceStartAt string `json:"serviceStartAt"`
	Status         string `json:"status"`
}

func List(c *fiber.Ctx) error {
	var campuses []model.Campus
	query := db.DB.Order("created_at desc")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&campuses).Error; err != nil {
		return response.Error(c, "查询校区失败")
	}

	return response.Success(c, campuses)
}

func Create(c *fiber.Ctx) error {
	var req campusPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if req.Name == "" || req.Code == "" {
		return response.Error(c, "校区名称和编码不能为空")
	}

	campus := model.Campus{
		Address:        req.Address,
		Code:           req.Code,
		ContactPerson:  req.ContactPerson,
		ContactPhone:   req.ContactPhone,
		Name:           req.Name,
		ServiceEndAt:   req.ServiceEndAt,
		ServiceStartAt: req.ServiceStartAt,
		Status:         defaultString(req.Status, "active"),
	}

	if err := db.DB.Create(&campus).Error; err != nil {
		return response.Error(c, "创建校区失败")
	}

	return response.Success(c, campus)
}

func Update(c *fiber.Ctx) error {
	var req campusPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var campus model.Campus
	if err := db.DB.First(&campus, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "校区不存在")
	}

	campus.Address = req.Address
	campus.Code = req.Code
	campus.ContactPerson = req.ContactPerson
	campus.ContactPhone = req.ContactPhone
	campus.Name = req.Name
	campus.ServiceEndAt = req.ServiceEndAt
	campus.ServiceStartAt = req.ServiceStartAt
	campus.Status = defaultString(req.Status, campus.Status)

	if err := db.DB.Save(&campus).Error; err != nil {
		return response.Error(c, "更新校区失败")
	}

	return response.Success(c, campus)
}

func defaultString(value string, fallback string) string {
	if value == "" {
		return fallback
	}

	return value
}
