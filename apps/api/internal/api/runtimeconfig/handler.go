package runtimeconfig

import (
	"github.com/gofiber/fiber/v2"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	service "github.com/ydfk/edu-nexa/apps/api/internal/service/runtimeconfig"
)

type payload struct {
	ImageSecurityEnable bool   `json:"imageSecurityEnable"`
	ImageSecurityStrict bool   `json:"imageSecurityStrict"`
	TextSecurityEnable  bool   `json:"textSecurityEnable"`
	TextSecurityStrict  bool   `json:"textSecurityStrict"`
	UploadProvider      string `json:"uploadProvider"`
}

func Get(c *fiber.Ctx) error {
	snapshot, err := service.GetSnapshot()
	if err != nil {
		return response.Error(c, "查询运行配置失败")
	}

	return response.Success(c, snapshot)
}

func Update(c *fiber.Ctx) error {
	var req payload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	snapshot, err := service.SaveSnapshot(&service.Snapshot{
		ImageSecurityEnable: req.ImageSecurityEnable,
		ImageSecurityStrict: req.ImageSecurityStrict,
		TextSecurityEnable:  req.TextSecurityEnable,
		TextSecurityStrict:  req.TextSecurityStrict,
		UploadProvider:      req.UploadProvider,
	})
	if err != nil {
		return response.Error(c, "保存运行配置失败")
	}

	return response.Success(c, snapshot)
}
