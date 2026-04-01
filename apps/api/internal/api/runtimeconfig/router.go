package runtimeconfig

import "github.com/gofiber/fiber/v2"

func RegisterPublicRoutes(router fiber.Router) {
	grp := router.Group("/runtime-settings")
	grp.Get("/", Get)
}

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/runtime-settings")
	grp.Put("/", Update)
}
