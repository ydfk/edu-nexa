package auth

import (
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
	"github.com/ydfk/edu-nexa/apps/api/internal/service"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

var generateFromPassword = bcrypt.GenerateFromPassword

func Register(c *fiber.Ctx) error {
	var req struct {
		DisplayName string   `json:"displayName"`
		Phone       string   `json:"phone"`
		Password    string   `json:"password"`
		Roles       []string `json:"roles"`
	}

	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if req.Phone == "" || req.Password == "" {
		return response.Error(c, "手机号和密码不能为空")
	}

	if len(req.Roles) == 0 {
		req.Roles = []string{"teacher"}
	}

	hash, err := generateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, "密码加密失败")
	}

	user := model.User{
		DisplayName: req.DisplayName,
		Phone:       req.Phone,
		Roles:       strings.Join(req.Roles, ","),
		Password:    string(hash),
	}

	if err := db.DB.Create(&user).Error; err != nil {
		return response.Error(c, "手机号已存在")
	}

	return response.Success(c, buildUserPayload(user))
}

// @Summary 用户登录
// @Description 管理端使用手机号和密码登录
// @Tags auth
// @Accept json
// @Produce json
// @Param login body LoginRequest true "登录信息"
// @Success 200 {object} LoginResponse
// @Failure 401 {object} ErrorResponse
// @Router /api/auth/login [post]
func Login(c *fiber.Ctx) error {
	var req struct {
		Phone    string `json:"phone"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var user model.User
	if err := db.DB.Where("phone = ?", req.Phone).First(&user).Error; err != nil {
		return response.Error(c, "手机号不存在")
	}

	if user.Password == "" {
		return response.Error(c, "该账号未设置管理端密码")
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)) != nil {
		return response.Error(c, "密码不正确")
	}

	token, err := service.GenerateJWT(&user)
	if err != nil {
		return response.Error(c, "token 生成失败")
	}

	return response.Success(c, buildLoginPayload(user, token, "admin_password"))
}

func Profile(c *fiber.Ctx) error {
	user, err := service.CurrentUser(c)
	if err != nil {
		return response.Error(c, "用户未找到")
	}

	return response.Success(c, buildUserPayload(*user))
}

func WeappPhoneLogin(c *fiber.Ctx) error {
	var req struct {
		PhoneCode string `json:"phoneCode"`
		RoleHint  string `json:"roleHint"`
		WxCode    string `json:"wxCode"`
	}

	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if req.WxCode == "" || req.PhoneCode == "" {
		return response.Error(c, "缺少微信登录凭证")
	}

	phone, err := service.ResolveWeappPhoneNumber()
	if err != nil {
		return response.Error(c, err.Error())
	}

	user, err := service.EnsureUserByPhone(phone, req.RoleHint)
	if err != nil {
		return response.Error(c, "微信手机号登录失败")
	}

	token, err := service.GenerateJWT(user)
	if err != nil {
		return response.Error(c, "token 生成失败")
	}

	return response.Success(c, buildLoginPayload(*user, token, "weapp_phone"))
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

	items := strings.Split(raw, ",")
	roles := make([]string, 0, len(items))
	for _, item := range items {
		role := strings.TrimSpace(item)
		if role == "" {
			continue
		}
		roles = append(roles, role)
	}

	return roles
}

func buildLoginPayload(user model.User, token string, loginType string) fiber.Map {
	return fiber.Map{
		"loginType": loginType,
		"token":     token,
		"user":      buildUserPayload(user),
	}
}
