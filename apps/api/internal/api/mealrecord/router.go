package mealrecord

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/meal-records")
	grp.Get("/", List)
}
