package campus

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/campuses")
	grp.Get("/", List)
	grp.Post("/", Create)
	grp.Put("/:id", Update)
}
