package health

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(router *fiber.App) {
	router.Get("/api/health", Check)
}
