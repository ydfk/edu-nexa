package service

import (
	"errors"
	"strings"

	model "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"gorm.io/gorm"
)

var allowedRoles = map[string]struct{}{
	"admin":    {},
	"teacher":  {},
	"guardian": {},
	"student":  {},
}

func ResolveWeappPhoneNumber() (string, error) {
	if config.Current.Wechat.DevPhone != "" {
		return config.Current.Wechat.DevPhone, nil
	}

	if config.Current.Wechat.AppID == "" || config.Current.Wechat.AppSecret == "" {
		return "", errors.New("未配置微信手机号换取参数")
	}

	return "", errors.New("尚未接入真实微信手机号换取逻辑")
}

func EnsureUserByPhone(phone string, roleHint string) (*model.User, error) {
	var user model.User
	result := db.DB.Where("phone = ?", phone).First(&user)
	if result.Error == nil {
		normalizedRole := normalizeRole(roleHint)
		mergedRoles := mergeRoles(user.Roles, normalizedRole)
		if mergedRoles != user.Roles {
			user.Roles = mergedRoles
			if err := db.DB.Save(&user).Error; err != nil {
				return nil, err
			}
		}
		return &user, nil
	}

	if !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return nil, result.Error
	}

	user = model.User{
		DisplayName: defaultDisplayName(roleHint),
		Phone:       phone,
		Roles:       normalizeRole(roleHint),
	}
	if err := db.DB.Create(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func normalizeRole(role string) string {
	trimmed := strings.TrimSpace(role)
	if trimmed == "" {
		return "guardian"
	}

	if _, ok := allowedRoles[trimmed]; ok {
		return trimmed
	}

	return "guardian"
}

func mergeRoles(raw string, role string) string {
	items := splitRoleString(raw)
	for _, item := range items {
		if item == role {
			return strings.Join(items, ",")
		}
	}

	items = append(items, role)
	return strings.Join(items, ",")
}

func splitRoleString(raw string) []string {
	if raw == "" {
		return []string{}
	}

	parts := strings.Split(raw, ",")
	roles := make([]string, 0, len(parts))
	for _, part := range parts {
		role := strings.TrimSpace(part)
		if role == "" {
			continue
		}
		roles = append(roles, role)
	}

	return roles
}

func defaultDisplayName(role string) string {
	switch normalizeRole(role) {
	case "admin":
		return "机构管理员"
	case "teacher":
		return "晚辅教师"
	case "student":
		return "学生账号"
	default:
		return "家长"
	}
}
