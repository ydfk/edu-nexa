package serviceday

import (
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/serviceday"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type dayPayload struct {
	CampusID                  string `json:"campusId"`
	HasHomeworkService        bool   `json:"hasHomeworkService"`
	HasMealService            bool   `json:"hasMealService"`
	HasLunchService           bool   `json:"hasLunchService"`
	HasDinnerService          bool   `json:"hasDinnerService"`
	HasDaytimeHomeworkService bool   `json:"hasDaytimeHomeworkService"`
	HasEveningHomeworkService bool   `json:"hasEveningHomeworkService"`
	WorkHours                 string `json:"workHours"`
	Remark                    string `json:"remark"`
	ServiceDate               string `json:"serviceDate"`
}

func List(c *fiber.Ctx) error {
	var days []model.Day
	database := db.FromFiber(c)
	query := database.Order("service_date desc, created_at desc")

	if serviceDate := strings.TrimSpace(c.Query("serviceDate")); serviceDate != "" {
		query = query.Where("service_date = ?", serviceDate)
	}
	if dateFrom := strings.TrimSpace(c.Query("dateFrom")); dateFrom != "" {
		query = query.Where("service_date >= ?", dateFrom)
	}
	if dateTo := strings.TrimSpace(c.Query("dateTo")); dateTo != "" {
		query = query.Where("service_date <= ?", dateTo)
	}

	if err := query.Find(&days).Error; err != nil {
		return response.Error(c, "查询服务日历失败")
	}

	return response.Success(c, days)
}

func Create(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var req dayPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if strings.TrimSpace(req.ServiceDate) == "" {
		return response.Error(c, "日期不能为空")
	}

	day := model.Day{
		CampusID:                  strings.TrimSpace(req.CampusID),
		HasHomeworkService:        mergeHomeworkService(req),
		HasMealService:            mergeMealService(req),
		HasLunchService:           req.HasLunchService,
		HasDinnerService:          req.HasDinnerService,
		HasDaytimeHomeworkService: req.HasDaytimeHomeworkService,
		HasEveningHomeworkService: req.HasEveningHomeworkService,
		WorkHours:                 strings.TrimSpace(req.WorkHours),
		Remark:                    strings.TrimSpace(req.Remark),
		ServiceDate:               strings.TrimSpace(req.ServiceDate),
	}

	if err := database.Create(&day).Error; err != nil {
		return response.Error(c, "创建服务日历失败")
	}

	return response.Success(c, day)
}

func Update(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var req dayPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var day model.Day
	if err := database.First(&day, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "服务日历不存在")
	}

	day.CampusID = strings.TrimSpace(req.CampusID)
	day.HasHomeworkService = mergeHomeworkService(req)
	day.HasMealService = mergeMealService(req)
	day.HasLunchService = req.HasLunchService
	day.HasDinnerService = req.HasDinnerService
	day.HasDaytimeHomeworkService = req.HasDaytimeHomeworkService
	day.HasEveningHomeworkService = req.HasEveningHomeworkService
	day.WorkHours = strings.TrimSpace(req.WorkHours)
	day.Remark = strings.TrimSpace(req.Remark)
	day.ServiceDate = strings.TrimSpace(req.ServiceDate)

	if err := database.Save(&day).Error; err != nil {
		return response.Error(c, "更新服务日历失败")
	}

	return response.Success(c, day)
}

func mergeMealService(req dayPayload) bool {
	if req.HasLunchService || req.HasDinnerService {
		return true
	}

	return req.HasMealService
}

func mergeHomeworkService(req dayPayload) bool {
	if req.HasDaytimeHomeworkService || req.HasEveningHomeworkService {
		return true
	}

	return req.HasHomeworkService
}
