package homeworkrecord

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/homework-records")
	grp.Get("/", List)
}
