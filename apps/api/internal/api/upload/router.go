package upload

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/uploads")
	grp.Post("/images", UploadImage)
	grp.Post("/files", UploadFile)
}
