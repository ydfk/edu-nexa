package usermanagement

import (
	"errors"
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

type updateUserPayload struct {
	DisplayName string   `json:"displayName"`
	Phone       string   `json:"phone"`
	Roles       []string `json:"roles"`
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
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Roles = normalizeRoles(req.Roles)

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

func Update(c *fiber.Ctx) error {
	currentUser, err := service.CurrentUser(c)
	if err != nil {
		return response.Error(c, "用户未找到")
	}
	if !hasRole(currentUser.Roles, "admin") {
		return response.Error(c, "没有权限")
	}

	var req updateUserPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	req.DisplayName = strings.TrimSpace(req.DisplayName)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Roles = normalizeRoles(req.Roles)
	if req.Phone == "" || len(req.Roles) == 0 {
		return response.Error(c, "手机号和角色不能为空")
	}

	var user model.User
	if err := db.DB.First(&user, "id = ?", c.Params("id")).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return response.Error(c, "账号不存在")
		}
		return response.Error(c, "查询账号失败")
	}

	if err := ensureUserPhoneUnique(req.Phone, user.Id.String()); err != nil {
		return response.Error(c, err.Error())
	}

	user.DisplayName = req.DisplayName
	user.Phone = req.Phone
	user.Roles = joinRoles(req.Roles)
	if err := db.DB.Save(&user).Error; err != nil {
		return response.Error(c, "更新账号失败")
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
	return strings.Join(normalizeRoles(roles), ",")
}

func hasRole(raw string, expected string) bool {
	for _, role := range splitRoles(raw) {
		if role == expected {
			return true
		}
	}

	return false
}

func normalizeRoles(roles []string) []string {
	items := make([]string, 0, len(roles))
	seen := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		trimmed := strings.TrimSpace(role)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		items = append(items, trimmed)
	}

	return items
}

func ensureUserPhoneUnique(phone string, excludeID string) error {
	var count int64
	query := db.DB.Model(&model.User{}).Where("phone = ?", phone)
	if excludeID != "" {
		query = query.Where("id <> ?", excludeID)
	}

	if err := query.Count(&count).Error; err != nil {
		return errors.New("校验手机号失败")
	}
	if count > 0 {
		return fiber.NewError(fiber.StatusBadRequest, "手机号已存在")
	}

	return nil
}
