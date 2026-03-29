package health

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"

	"github.com/gofiber/fiber/v2"
)

func Check(c *fiber.Ctx) error {
	return response.Success(c, fiber.Map{
		"name":   "EduNexa API",
		"status": "ok",
	})
}
