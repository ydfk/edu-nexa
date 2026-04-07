package upload

import "github.com/gofiber/fiber/v2"

func RegisterPublicRoutes(router fiber.Router) {
	grp := router.Group("/uploads")
	grp.Options("/preview", PreviewFileOptions)
	grp.Options("/preview/*", PreviewFileOptions)
	grp.Get("/preview", PreviewFile)
	grp.Get("/preview/*", PreviewFile)
}

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/uploads")
	grp.Get("/access-url", CreateAccessURL)
	grp.Get("/aliyun-post-form", CreateAliyunPostForm)
	grp.Get("/aliyun-sts", CreateAliyunSTSUpload)
	grp.Get("/direct-upload-url", CreateDirectUploadURL)
	grp.Post("/images", UploadImage)
	grp.Post("/files", UploadFile)
}
