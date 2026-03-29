package auth

import "github.com/gofiber/fiber/v2"

func RegisterUnProtectedRoutes(router *fiber.App) {
	grp := router.Group("/api/auth")
	grp.Post("/register", Register)
	grp.Post("/login", Login)
	grp.Post("/weapp/phone-login", WeappPhoneLogin)
}

func RegisterRoutes(router fiber.Router) {
	grp := router.Group("/auth")
	grp.Get("/profile", Profile)
}
