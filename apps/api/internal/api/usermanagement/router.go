package usermanagement

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/users")
	grp.Get("/", List)
	grp.Post("/", Create)
	grp.Put("/:id", Update)
	grp.Delete("/:id", Delete)
	grp.Post("/:id/reset-password", ResetPassword)
}
