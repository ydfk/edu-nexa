package homeconfig

import (
	"encoding/json"
	"errors"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/homeconfig"
	"github.com/ydfk/edu-nexa/apps/api/internal/service/contentsafety"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const homeScene = "weapp-home"

type bannerPayload struct {
	ID       string `json:"id"`
	Image    string `json:"image"`
	Subtitle string `json:"subtitle"`
	Title    string `json:"title"`
}

type configPayload struct {
	Announcement string          `json:"announcement"`
	Banners      []bannerPayload `json:"banners"`
	HeroSubtitle string          `json:"heroSubtitle"`
	HeroTitle    string          `json:"heroTitle"`
}

func Get(c *fiber.Ctx) error {
	config, err := getOrCreateConfig()
	if err != nil {
		return response.Error(c, "查询首页配置失败")
	}

	return response.Success(c, toResponse(config))
}

func Update(c *fiber.Ctx) error {
	var req configPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if err := validateHomeConfigText(req); err != nil {
		return response.Error(c, err.Error())
	}

	bannersJSON, err := json.Marshal(defaultBanners(req.Banners))
	if err != nil {
		return response.Error(c, "首页图片配置格式不正确")
	}

	config, err := findConfig()
	if err != nil {
		return response.Error(c, "查询首页配置失败")
	}
	if config == nil {
		config = &model.Config{
			Scene: homeScene,
		}
	}

	config.Announcement = req.Announcement
	config.BannersJSON = string(bannersJSON)
	config.HeroSubtitle = req.HeroSubtitle
	config.HeroTitle = req.HeroTitle

	if config.Id == uuid.Nil {
		if err := db.DB.Create(config).Error; err != nil {
			return response.Error(c, "保存首页配置失败")
		}
	} else {
		if err := db.DB.Save(config).Error; err != nil {
			return response.Error(c, "保存首页配置失败")
		}
	}

	return response.Success(c, toResponse(config))
}

func getOrCreateConfig() (*model.Config, error) {
	config, err := findConfig()
	if err != nil {
		return nil, err
	}
	if config != nil {
		return config, nil
	}

	bannersJSON, err := json.Marshal(defaultBanners(nil))
	if err != nil {
		return nil, err
	}

	config = &model.Config{
		Announcement: "首页介绍、图片和公告都可以在后台统一配置。",
		BannersJSON:  string(bannersJSON),
		HeroSubtitle: "首页介绍、用餐反馈、作业反馈都围绕晚辅主链路展开。",
		HeroTitle:    "教师记录，监护人查看。",
		Scene:        homeScene,
	}
	if err := db.DB.Create(config).Error; err != nil {
		return nil, err
	}

	return config, nil
}

func findConfig() (*model.Config, error) {
	var config model.Config
	if err := db.DB.First(&config, "scene = ?", homeScene).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &config, nil
}

func toResponse(config *model.Config) fiber.Map {
	var banners []bannerPayload
	if err := json.Unmarshal([]byte(config.BannersJSON), &banners); err != nil {
		banners = defaultBanners(nil)
	}

	return fiber.Map{
		"announcement": config.Announcement,
		"banners":      defaultBanners(banners),
		"heroSubtitle": config.HeroSubtitle,
		"heroTitle":    config.HeroTitle,
		"scene":        config.Scene,
	}
}

func defaultBanners(banners []bannerPayload) []bannerPayload {
	if len(banners) > 0 {
		items := make([]bannerPayload, 0, len(banners))
		for index, item := range banners {
			items = append(items, bannerPayload{
				ID:       defaultBannerID(item.ID, index),
				Image:    defaultString(item.Image, defaultBannerImage(index)),
				Subtitle: item.Subtitle,
				Title:    item.Title,
			})
		}
		return items
	}

	return []bannerPayload{
		{
			ID:       "banner-campus",
			Image:    "/assets/intro-campus.svg",
			Subtitle: "首页介绍、图片和公告都可以在后台统一配置。",
			Title:    "机构介绍和服务说明先在首页讲清楚",
		},
		{
			ID:       "banner-feedback",
			Image:    "/assets/intro-feedback.svg",
			Subtitle: "教师记录，监护人按日期查看，多学生家庭支持切换。",
			Title:    "晚辅用餐和作业反馈是当前两条主链路",
		},
	}
}

func defaultBannerID(id string, index int) string {
	if id != "" {
		return id
	}
	if index == 0 {
		return "banner-campus"
	}
	if index == 1 {
		return "banner-feedback"
	}
	return "banner-item"
}

func defaultBannerImage(index int) string {
	if index == 0 {
		return "/assets/intro-campus.svg"
	}
	if index == 1 {
		return "/assets/intro-feedback.svg"
	}
	return "/assets/intro-campus.svg"
}

func defaultString(value string, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func validateHomeConfigText(req configPayload) error {
	if err := contentsafety.CheckText(req.HeroTitle + "\n" + req.HeroSubtitle + "\n" + req.Announcement); err != nil {
		return err
	}
	for _, banner := range req.Banners {
		if err := contentsafety.CheckText(banner.Title + "\n" + banner.Subtitle); err != nil {
			return err
		}
	}

	return nil
}
