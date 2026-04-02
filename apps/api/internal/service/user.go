package service

import (
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
)

func GenerateJWT(user *model.User) (string, error) {
	claims := jwt.MapClaims{
		"display_name": user.DisplayName,
		"exp":          time.Now().Add(time.Duration(config.Current.Jwt.Expiration) * time.Second).Unix(),
		"phone":        user.Phone,
		"roles":        user.Roles,
		"user_id":      user.Id,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.Current.Jwt.Secret))
}

func CurrentUser(c *fiber.Ctx) (user *model.User, err error) {
	if cached, ok := c.Locals("current_user_model").(*model.User); ok && cached != nil {
		return cached, nil
	}

	raw := c.Locals("user")
	if raw == nil {
		return nil, errors.New("no jwt token in context")
	}

	token, ok := raw.(*jwt.Token)
	if !ok {
		return nil, errors.New("invalid jwt token in context")
	}
	if !token.Valid {
		return nil, errors.New("invalid jwt token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid jwt claims")
	}

	userID, err := parseUserIDClaim(claims)
	if err != nil {
		return nil, err
	}

	dbUser, err := db.GetUserById(userID)
	if err != nil {
		return nil, err
	}
	if err := EnsureUserActive(dbUser); err != nil {
		return nil, err
	}

	c.Locals("current_user_model", &dbUser)

	return &dbUser, nil
}

func EnsureUserActive(user model.User) error {
	if IsActiveStatus(user.Status) {
		return nil
	}

	return errors.New("账号已禁用")
}

func IsActiveStatus(status string) bool {
	trimmed := strings.TrimSpace(status)
	return trimmed == "" || trimmed == "active"
}

func parseUserIDClaim(claims jwt.MapClaims) (string, error) {
	value, ok := claims["user_id"]
	if !ok || value == nil {
		return "", errors.New("user_id claim missing")
	}

	switch typed := value.(type) {
	case string:
		if typed == "" {
			return "", errors.New("user_id claim missing")
		}
		return typed, nil
	case uuid.UUID:
		return typed.String(), nil
	case []byte:
		if len(typed) == 0 {
			return "", errors.New("user_id claim missing")
		}
		return string(typed), nil
	default:
		return "", errors.New("user_id claim invalid")
	}
}
