package main

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/auth"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/campus"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/health"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/homeworkrecord"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/mealrecord"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/overview"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/student"
	"github.com/ydfk/edu-nexa/apps/api/internal/middleware"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/logger"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	fiberLogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	jwtware "github.com/gofiber/jwt/v3"
	"github.com/gofiber/swagger"
)

func api() {
	app := fiber.New(fiber.Config{
		ErrorHandler: middleware.ErrorHandler,
	})

	app.Get("/swagger/*", swagger.HandlerDefault)

	app.Use(recover.New())
	app.Use(cors.New())
	app.Use(fiberLogger.New(fiberLogger.Config{
		Format: "${ip} ${status} ${latency} ${method} ${path}\n",
		Output: logger.GetFiberLogWriter(),
	}))

	health.RegisterRoutes(app)
	auth.RegisterUnProtectedRoutes(app)

	protectedAPI := app.Group("/api")
	protectedAPI.Use(jwtware.New(jwtware.Config{
		SigningKey: []byte(config.Current.Jwt.Secret),
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			logger.Error("JWT 验证失败: %v", err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code":    fiber.StatusUnauthorized,
				"message": "认证失败，请先登录",
			})
		},
	}))

	auth.RegisterRoutes(protectedAPI)
	overview.RegisterRoutes(protectedAPI)
	campus.RegisterRoutes(protectedAPI)
	student.RegisterRoutes(protectedAPI)
	mealrecord.RegisterRoutes(protectedAPI)
	homeworkrecord.RegisterRoutes(protectedAPI)

	if err := app.Listen(":" + config.Current.App.Port); err != nil {
		logger.Fatal("启动服务失败: %v", err)
	}

	logger.Info("服务已启动: http://127.0.0.1:%v", config.Current.App.Port)
}
