package homeconfig

import "github.com/gofiber/fiber/v2"

func RegisterPublicRoutes(router fiber.Router) {
	grp := router.Group("/home-config")
	grp.Get("/", Get)
}

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/home-config")
	grp.Put("/", Update)
}
