package overview

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/overview")
	grp.Get("/", GetSummary)
}
