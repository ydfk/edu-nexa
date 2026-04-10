package usermanagement

import (
	"errors"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	guardianbindingModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianbinding"
	guardianprofileModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianprofile"
	homeworkassignmentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	homeworkrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	mealrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/mealrecord"
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
	Status      string   `json:"status"`
}

type resetPasswordPayload struct {
	Password string `json:"password"`
}

type updateUserPayload struct {
	DisplayName string   `json:"displayName"`
	Phone       string   `json:"phone"`
	Roles       []string `json:"roles"`
	Status      string   `json:"status"`
}

func List(c *fiber.Ctx) error {
	currentUser, err := service.CurrentUser(c)
	if err != nil {
		return response.Error(c, err.Error())
	}
	if !hasRole(currentUser.Roles, "admin") {
		return response.Error(c, "没有权限")
	}

	var users []model.User
	database := db.FromFiber(c)
	query := database.Order("created_at desc")

	if role := strings.TrimSpace(c.Query("role")); role != "" {
		query = query.Where("roles LIKE ?", "%"+role+"%")
	}
	if phone := strings.TrimSpace(c.Query("phone")); phone != "" {
		query = query.Where("phone = ?", phone)
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
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
		return response.Error(c, err.Error())
	}
	if !hasRole(currentUser.Roles, "admin") {
		return response.Error(c, "没有权限")
	}
	database := db.FromFiber(c)

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
		Status:      defaultUserStatus(req.Status),
	}

	if err := database.Create(&user).Error; err != nil {
		return response.Error(c, "手机号已存在")
	}

	return response.Success(c, buildUserPayload(user))
}

func ResetPassword(c *fiber.Ctx) error {
	currentUser, err := service.CurrentUser(c)
	if err != nil {
		return response.Error(c, err.Error())
	}
	if !hasRole(currentUser.Roles, "admin") {
		return response.Error(c, "没有权限")
	}
	database := db.FromFiber(c)

	var req resetPasswordPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if req.Password == "" {
		return response.Error(c, "密码不能为空")
	}

	var user model.User
	if err := database.First(&user, "id = ?", c.Params("id")).Error; err != nil {
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
	if err := database.Save(&user).Error; err != nil {
		return response.Error(c, "重置密码失败")
	}

	return response.Success(c, buildUserPayload(user))
}

func Update(c *fiber.Ctx) error {
	currentUser, err := service.CurrentUser(c)
	if err != nil {
		return response.Error(c, err.Error())
	}
	if !hasRole(currentUser.Roles, "admin") {
		return response.Error(c, "没有权限")
	}
	database := db.FromFiber(c)

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
	if err := database.First(&user, "id = ?", c.Params("id")).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return response.Error(c, "账号不存在")
		}
		return response.Error(c, "查询账号失败")
	}
	if currentUser.Id == user.Id {
		if defaultUserStatus(req.Status) != "active" {
			return response.Error(c, "不能禁用当前登录账号")
		}
		if !hasRole(joinRoles(req.Roles), "admin") {
			return response.Error(c, "不能移除当前登录账号的管理员权限")
		}
	}

	if err := ensureUserPhoneUnique(database, req.Phone, user.Id.String()); err != nil {
		return response.Error(c, err.Error())
	}

	user.DisplayName = req.DisplayName
	user.Phone = req.Phone
	user.Roles = joinRoles(req.Roles)
	user.Status = defaultUserStatus(req.Status)
	if err := database.Save(&user).Error; err != nil {
		return response.Error(c, "更新账号失败")
	}

	return response.Success(c, buildUserPayload(user))
}

func Delete(c *fiber.Ctx) error {
	currentUser, err := service.CurrentUser(c)
	if err != nil {
		return response.Error(c, err.Error())
	}
	if !hasRole(currentUser.Roles, "admin") {
		return response.Error(c, "没有权限")
	}
	if currentUser.Id.String() == c.Params("id") {
		return response.Error(c, "不能删除当前登录账号")
	}
	database := db.FromFiber(c)

	var user model.User
	if err := database.First(&user, "id = ?", c.Params("id")).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return response.Error(c, "账号不存在")
		}
		return response.Error(c, "查询账号失败")
	}
	if err := ensureUserDeletable(database, user); err != nil {
		return response.Error(c, err.Error())
	}

	if err := database.Delete(&user).Error; err != nil {
		return response.Error(c, "删除账号失败")
	}

	return response.Success(c, fiber.Map{"id": user.Id})
}

func buildUserPayload(user model.User) fiber.Map {
	return fiber.Map{
		"displayName": user.DisplayName,
		"id":          user.Id,
		"phone":       user.Phone,
		"roles":       splitRoles(user.Roles),
		"status":      defaultUserStatus(user.Status),
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

func defaultUserStatus(status string) string {
	if strings.TrimSpace(status) == "" {
		return "active"
	}

	return strings.TrimSpace(status)
}

func ensureUserPhoneUnique(database *gorm.DB, phone string, excludeID string) error {
	var count int64
	query := database.Model(&model.User{}).Where("phone = ?", phone)
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

func ensureUserDeletable(database *gorm.DB, user model.User) error {
	var count int64
	if err := database.Model(&guardianprofileModel.Profile{}).Where("user_id = ?", user.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验账号关联家长失败")
	}
	if count > 0 {
		return errors.New("账号已关联家长信息，不能删除")
	}

	if err := database.Model(&guardianbindingModel.Binding{}).Where("guardian_user_id = ?", user.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验账号关联学生关系失败")
	}
	if count > 0 {
		return errors.New("账号已关联学生关系，不能删除")
	}

	if err := database.Model(&homeworkassignmentModel.Assignment{}).Where("teacher_id = ?", user.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验账号关联每日作业失败")
	}
	if count > 0 {
		return errors.New("账号已关联每日作业，不能删除")
	}

	if err := database.Model(&mealrecordModel.Record{}).Where("recorded_by_id = ?", user.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验账号关联用餐记录失败")
	}
	if count > 0 {
		return errors.New("账号已关联用餐记录，不能删除")
	}

	if err := database.Model(&homeworkrecordModel.Record{}).Where("recorded_by_id = ?", user.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验账号关联作业记录失败")
	}
	if count > 0 {
		return errors.New("账号已关联作业记录，不能删除")
	}

	return nil
}
