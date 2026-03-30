package adminseed

import (
	"errors"
	"strings"

	model "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"github.com/ydfk/edu-nexa/apps/api/pkg/logger"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func EnsureDefaultAdmin() error {
	seed := config.Current.AdminSeed
	if strings.TrimSpace(seed.Phone) == "" || strings.TrimSpace(seed.Password) == "" {
		return nil
	}

	var user model.User
	lookupErr := db.DB.Where("phone = ?", seed.Phone).First(&user).Error
	if lookupErr != nil && !errors.Is(lookupErr, gorm.ErrRecordNotFound) {
		return lookupErr
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(seed.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if errors.Is(lookupErr, gorm.ErrRecordNotFound) {
		user = model.User{
			DisplayName: defaultDisplayName(seed.DisplayName),
			Phone:       seed.Phone,
			Password:    string(hashedPassword),
			Roles:       "admin",
		}
		if err := db.DB.Create(&user).Error; err != nil {
			return err
		}
		logger.Info("默认管理员已初始化: %s", seed.Phone)
		return nil
	}

	updated := false
	if !strings.Contains(user.Roles, "admin") {
		if strings.TrimSpace(user.Roles) == "" {
			user.Roles = "admin"
		} else {
			user.Roles = user.Roles + ",admin"
		}
		updated = true
	}
	if strings.TrimSpace(user.DisplayName) == "" {
		user.DisplayName = defaultDisplayName(seed.DisplayName)
		updated = true
	}
	if user.Password != string(hashedPassword) {
		user.Password = string(hashedPassword)
		updated = true
	}

	if updated {
		if err := db.DB.Save(&user).Error; err != nil {
			return err
		}
		logger.Info("默认管理员账号已补全: %s", seed.Phone)
	}

	return nil
}

func defaultDisplayName(value string) string {
	if strings.TrimSpace(value) == "" {
		return "默认管理员"
	}

	return value
}
