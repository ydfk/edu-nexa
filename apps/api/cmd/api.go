package main

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/auth"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/classgroup"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/guardian"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/guardianprofile"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/gradelevel"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/health"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/homeconfig"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/homeworkassignment"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/homeworkrecord"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/mealrecord"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/overview"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/paymentrecord"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/runtimeconfig"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/school"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/serviceday"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/student"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/studentservice"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/teacher"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/upload"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/usermanagement"
	"github.com/ydfk/edu-nexa/apps/api/internal/middleware"
	"github.com/ydfk/edu-nexa/apps/api/internal/service"
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
	app.Static(config.Current.Storage.Local.PublicPath, config.Current.Storage.Local.Dir)

	health.RegisterRoutes(app)
	auth.RegisterUnProtectedRoutes(app)
	homeconfig.RegisterPublicRoutes(app.Group("/api"))
	runtimeconfig.RegisterPublicRoutes(app.Group("/api"))
	upload.RegisterPublicRoutes(app.Group("/api"))

	protectedAPI := app.Group("/api")
	protectedAPI.Use(jwtware.New(jwtware.Config{
		SigningKey: []byte(config.Current.Jwt.Secret),
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			logger.Error("JWT 验证失败: %v", err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code": fiber.StatusUnauthorized,
				"flag": false,
				"msg":  "认证失败，请先登录",
			})
		},
	}))
	protectedAPI.Use(func(c *fiber.Ctx) error {
		if _, err := service.CurrentUser(c); err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code": fiber.StatusUnauthorized,
				"flag": false,
				"msg":  err.Error(),
			})
		}

		return c.Next()
	})
	protectedAPI.Use(func(c *fiber.Ctx) error {
		if service.IsDemoUser(c) && !service.CanDemoMutate(c) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"code": fiber.StatusForbidden,
				"flag": false,
				"msg":  "demo 环境仅支持查看数据，不能修改管理数据",
			})
		}

		return c.Next()
	})

	auth.RegisterRoutes(protectedAPI)
	overview.RegisterRoutes(protectedAPI)
	school.RegisterRoutes(protectedAPI)
	gradelevel.RegisterRoutes(protectedAPI)
	classgroup.RegisterRoutes(protectedAPI)
	guardianprofile.RegisterRoutes(protectedAPI)
	student.RegisterRoutes(protectedAPI)
	guardian.RegisterRoutes(protectedAPI)
	teacher.RegisterRoutes(protectedAPI)
	usermanagement.RegisterRoutes(protectedAPI)
	studentservice.RegisterRoutes(protectedAPI)
	paymentrecord.RegisterRoutes(protectedAPI)
	runtimeconfig.RegisterRoutes(protectedAPI)
	serviceday.RegisterRoutes(protectedAPI)
	homeworkassignment.RegisterRoutes(protectedAPI)
	upload.RegisterRoutes(protectedAPI)
	homeconfig.RegisterRoutes(protectedAPI)
	mealrecord.RegisterRoutes(protectedAPI)
	homeworkrecord.RegisterRoutes(protectedAPI)

	if err := app.Listen(":" + config.Current.App.Port); err != nil {
		logger.Fatal("启动服务失败: %v", err)
	}

	logger.Info("服务已启动: http://127.0.0.1:%v", config.Current.App.Port)
}
