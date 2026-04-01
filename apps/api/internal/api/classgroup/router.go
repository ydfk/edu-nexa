package classgroup

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/classes")
	grp.Get("/", List)
	grp.Post("/", Create)
	grp.Put("/:id", Update)
}
