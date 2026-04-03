package homeworkassignment

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/daily-homework")
	grp.Get("/", List)
	grp.Get("/print-pdf", PrintPDF)
	grp.Post("/", Create)
	grp.Put("/:id", Update)
	grp.Delete("/:id", Delete)
}
