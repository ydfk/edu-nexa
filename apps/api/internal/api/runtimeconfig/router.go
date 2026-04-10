package runtimeconfig

import "github.com/gofiber/fiber/v2"

func RegisterPublicRoutes(router fiber.Router) {
	grp := router.Group("/runtime-settings")
	grp.Get("/", Get)
}

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/runtime-settings")
	grp.Get("/admin", GetAdmin)
	grp.Put("/", Update)
	grp.Post("/demo/initialize", InitializeDemo)
}
