package runtimeconfig

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	demoService "github.com/ydfk/edu-nexa/apps/api/internal/service/demoseed"
	authService "github.com/ydfk/edu-nexa/apps/api/internal/service"
	service "github.com/ydfk/edu-nexa/apps/api/internal/service/runtimeconfig"
)

type payload struct {
	SystemNamePrefix    string `json:"systemNamePrefix"`
	HomeworkSubjects    string `json:"homeworkSubjects"`
	PaymentTypes        string `json:"paymentTypes"`
	ImageSecurityEnable bool   `json:"imageSecurityEnable"`
	ImageSecurityStrict bool   `json:"imageSecurityStrict"`
	TextSecurityEnable  bool   `json:"textSecurityEnable"`
	TextSecurityStrict  bool   `json:"textSecurityStrict"`
	DemoTeacherName     string `json:"demoTeacherName"`
	DemoTeacherPhone    string `json:"demoTeacherPhone"`
	DemoTeacherPassword string `json:"demoTeacherPassword"`
	DemoGuardianName    string `json:"demoGuardianName"`
	DemoGuardianPhone   string `json:"demoGuardianPhone"`
	DemoGuardianPassword string `json:"demoGuardianPassword"`
}

func Get(c *fiber.Ctx) error {
	snapshot, err := service.GetSnapshot()
	if err != nil {
		return response.Error(c, "查询运行配置失败")
	}

	return response.Success(c, snapshot)
}

func GetAdmin(c *fiber.Ctx) error {
	if err := ensureRuntimeConfigAdmin(c); err != nil {
		return response.Error(c, err.Error(), fiber.StatusForbidden)
	}

	snapshot, err := service.GetAdminSnapshot()
	if err != nil {
		return response.Error(c, "查询运行配置失败")
	}

	return response.Success(c, snapshot)
}

func Update(c *fiber.Ctx) error {
	if err := ensureRuntimeConfigAdmin(c); err != nil {
		return response.Error(c, err.Error(), fiber.StatusForbidden)
	}

	var req payload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	snapshot, err := service.SaveSnapshot(&service.Snapshot{
		SystemNamePrefix:    req.SystemNamePrefix,
		HomeworkSubjects:    req.HomeworkSubjects,
		PaymentTypes:        req.PaymentTypes,
		ImageSecurityEnable: req.ImageSecurityEnable,
		ImageSecurityStrict: req.ImageSecurityStrict,
		TextSecurityEnable:  req.TextSecurityEnable,
		TextSecurityStrict:  req.TextSecurityStrict,
		DemoTeacherName:     req.DemoTeacherName,
		DemoTeacherPhone:    req.DemoTeacherPhone,
		DemoTeacherPassword: req.DemoTeacherPassword,
		DemoGuardianName:    req.DemoGuardianName,
		DemoGuardianPhone:   req.DemoGuardianPhone,
		DemoGuardianPassword: req.DemoGuardianPassword,
	})
	if err != nil {
		return response.Error(c, "保存运行配置失败")
	}

	return response.Success(c, snapshot)
}

func InitializeDemo(c *fiber.Ctx) error {
	if err := ensureRuntimeConfigAdmin(c); err != nil {
		return response.Error(c, err.Error(), fiber.StatusForbidden)
	}

	snapshot, err := demoService.RebuildFromRuntimeSettings()
	if err != nil {
		return response.Error(c, err.Error())
	}

	return response.Success(c, snapshot)
}

func ensureRuntimeConfigAdmin(c *fiber.Ctx) error {
	user, err := authService.CurrentUser(c)
	if err != nil {
		return err
	}

	for _, role := range strings.Split(user.Roles, ",") {
		if strings.TrimSpace(role) == "admin" {
			return nil
		}
	}

	return fiber.NewError(fiber.StatusForbidden, "只有管理员可以操作系统设置")
}
