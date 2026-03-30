package serviceday

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/serviceday"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type dayPayload struct {
	CampusID           string `json:"campusId"`
	HasHomeworkService bool   `json:"hasHomeworkService"`
	HasMealService     bool   `json:"hasMealService"`
	Remark             string `json:"remark"`
	ServiceDate        string `json:"serviceDate"`
}

func List(c *fiber.Ctx) error {
	var days []model.Day
	query := db.DB.Order("service_date desc, created_at desc")

	if campusID := c.Query("campusId"); campusID != "" {
		query = query.Where("campus_id = ?", campusID)
	}
	if serviceDate := c.Query("serviceDate"); serviceDate != "" {
		query = query.Where("service_date = ?", serviceDate)
	}
	if dateFrom := c.Query("dateFrom"); dateFrom != "" {
		query = query.Where("service_date >= ?", dateFrom)
	}
	if dateTo := c.Query("dateTo"); dateTo != "" {
		query = query.Where("service_date <= ?", dateTo)
	}

	if err := query.Find(&days).Error; err != nil {
		return response.Error(c, "查询服务日历失败")
	}

	return response.Success(c, days)
}

func Create(c *fiber.Ctx) error {
	var req dayPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if req.CampusID == "" || req.ServiceDate == "" {
		return response.Error(c, "校区和日期不能为空")
	}

	day := model.Day{
		CampusID:           req.CampusID,
		HasHomeworkService: req.HasHomeworkService,
		HasMealService:     req.HasMealService,
		Remark:             req.Remark,
		ServiceDate:        req.ServiceDate,
	}

	if err := db.DB.Create(&day).Error; err != nil {
		return response.Error(c, "创建服务日历失败")
	}

	return response.Success(c, day)
}

func Update(c *fiber.Ctx) error {
	var req dayPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var day model.Day
	if err := db.DB.First(&day, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "服务日历不存在")
	}

	day.CampusID = req.CampusID
	day.HasHomeworkService = req.HasHomeworkService
	day.HasMealService = req.HasMealService
	day.Remark = req.Remark
	day.ServiceDate = req.ServiceDate

	if err := db.DB.Save(&day).Error; err != nil {
		return response.Error(c, "更新服务日历失败")
	}

	return response.Success(c, day)
}
