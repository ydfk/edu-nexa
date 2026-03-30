package runtimeconfig

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/runtime-settings")
	grp.Get("/", Get)
	grp.Put("/", Update)
}
