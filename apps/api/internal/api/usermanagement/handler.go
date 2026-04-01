package usermanagement

import (
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
	"github.com/ydfk/edu-nexa/apps/api/internal/service"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type createUserPayload struct {
	DisplayName string   `json:"displayName"`
	Password    string   `json:"password"`
	Phone       string   `json:"phone"`
	Roles       []string `json:"roles"`
}

type resetPasswordPayload struct {
	Password string `json:"password"`
}

func List(c *fiber.Ctx) error {
	currentUser, err := service.CurrentUser(c)
	if err != nil {
		return response.Error(c, "用户未找到")
	}
	if !hasRole(currentUser.Roles, "admin") {
		return response.Error(c, "没有权限")
	}

	var users []model.User
	query := db.DB.Order("created_at desc")

	if role := strings.TrimSpace(c.Query("role")); role != "" {
		query = query.Where("roles LIKE ?", "%"+role+"%")
	}
	if phone := strings.TrimSpace(c.Query("phone")); phone != "" {
		query = query.Where("phone = ?", phone)
	}

	if err := query.Find(&users).Error; err != nil {
		return response.Error(c, "查询账号失败")
	}

	items := make([]fiber.Map, 0, len(users))
	for _, user := range users {
		items = append(items, buildUserPayload(user))
	}

	return response.Success(c, items)
}

func Create(c *fiber.Ctx) error {
	currentUser, err := service.CurrentUser(c)
	if err != nil {
		return response.Error(c, "用户未找到")
	}
	if !hasRole(currentUser.Roles, "admin") {
		return response.Error(c, "没有权限")
	}

	var req createUserPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if req.Phone == "" || req.Password == "" || len(req.Roles) == 0 {
		return response.Error(c, "手机号、密码和角色不能为空")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, "密码加密失败")
	}

	user := model.User{
		DisplayName: req.DisplayName,
		Phone:       req.Phone,
		Password:    string(hash),
		Roles:       joinRoles(req.Roles),
	}

	if err := db.DB.Create(&user).Error; err != nil {
		return response.Error(c, "手机号已存在")
	}

	return response.Success(c, buildUserPayload(user))
}

func ResetPassword(c *fiber.Ctx) error {
	currentUser, err := service.CurrentUser(c)
	if err != nil {
		return response.Error(c, "用户未找到")
	}
	if !hasRole(currentUser.Roles, "admin") {
		return response.Error(c, "没有权限")
	}

	var req resetPasswordPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if req.Password == "" {
		return response.Error(c, "密码不能为空")
	}

	var user model.User
	if err := db.DB.First(&user, "id = ?", c.Params("id")).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return response.Error(c, "账号不存在")
		}
		return response.Error(c, "查询账号失败")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, "密码加密失败")
	}

	user.Password = string(hash)
	if err := db.DB.Save(&user).Error; err != nil {
		return response.Error(c, "重置密码失败")
	}

	return response.Success(c, buildUserPayload(user))
}

func buildUserPayload(user model.User) fiber.Map {
	return fiber.Map{
		"displayName": user.DisplayName,
		"id":          user.Id,
		"phone":       user.Phone,
		"roles":       splitRoles(user.Roles),
	}
}

func splitRoles(raw string) []string {
	if raw == "" {
		return []string{}
	}

	parts := strings.Split(raw, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		role := strings.TrimSpace(part)
		if role == "" {
			continue
		}
		items = append(items, role)
	}

	return items
}

func joinRoles(roles []string) string {
	items := make([]string, 0, len(roles))
	for _, role := range roles {
		trimmed := strings.TrimSpace(role)
		if trimmed == "" {
			continue
		}
		items = append(items, trimmed)
	}

	return strings.Join(items, ",")
}

func hasRole(raw string, expected string) bool {
	for _, role := range splitRoles(raw) {
		if role == expected {
			return true
		}
	}

	return false
}
