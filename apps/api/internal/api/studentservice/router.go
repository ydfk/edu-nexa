package studentservice

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/student-services")
	grp.Get("/", List)
	grp.Post("/", Create)
	grp.Put("/:id", Update)
	grp.Delete("/:id", Delete)
}
