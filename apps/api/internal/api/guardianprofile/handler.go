package guardianprofile

import (
	"errors"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	guardianbindingModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianbinding"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianprofile"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	userModel "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type guardianPayload struct {
	Name         string `json:"name"`
	Password     string `json:"password"`
	Phone        string `json:"phone"`
	Relationship string `json:"relationship"`
	Remark       string `json:"remark"`
	Status       string `json:"status"`
}

func List(c *fiber.Ctx) error {
	var items []model.Profile
	database := db.FromFiber(c)
	query := database.Order("created_at desc")

	if keyword := strings.TrimSpace(c.Query("keyword")); keyword != "" {
		query = query.Where("name LIKE ? OR phone LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&items).Error; err != nil {
		return response.Error(c, "查询家长失败")
	}

	return response.Success(c, items)
}

func Create(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var req guardianPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Phone) == "" {
		return response.Error(c, "家长姓名和手机号不能为空")
	}
	if strings.TrimSpace(req.Password) == "" {
		return response.Error(c, "密码不能为空")
	}
	if exists, err := existsPhone(database, strings.TrimSpace(req.Phone), ""); err != nil {
		return response.Error(c, "校验家长手机号失败")
	} else if exists {
		return response.Error(c, "家长手机号已存在")
	}

	item := model.Profile{
		Name:         strings.TrimSpace(req.Name),
		Phone:        strings.TrimSpace(req.Phone),
		Relationship: strings.TrimSpace(req.Relationship),
		Remark:       strings.TrimSpace(req.Remark),
		Status:       defaultGuardianStatus(req.Status),
	}
	if err := database.Transaction(func(tx *gorm.DB) error {
		user, err := upsertGuardianUser(
			tx,
			item.UserID,
			item.Name,
			item.Phone,
			strings.TrimSpace(req.Password),
			item.Status,
		)
		if err != nil {
			return err
		}
		item.UserID = user.Id.String()

		return tx.Create(&item).Error
	}); err != nil {
		return response.Error(c, err.Error())
	}

	return response.Success(c, item)
}

func Update(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var req guardianPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if strings.TrimSpace(req.Name) == "" || strings.TrimSpace(req.Phone) == "" {
		return response.Error(c, "家长姓名和手机号不能为空")
	}

	var item model.Profile
	if err := database.First(&item, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "家长不存在")
	}
	if exists, err := existsPhone(database, strings.TrimSpace(req.Phone), c.Params("id")); err != nil {
		return response.Error(c, "校验家长手机号失败")
	} else if exists {
		return response.Error(c, "家长手机号已存在")
	}

	item.Name = strings.TrimSpace(req.Name)
	item.Phone = strings.TrimSpace(req.Phone)
	item.Relationship = strings.TrimSpace(req.Relationship)
	item.Remark = strings.TrimSpace(req.Remark)
	item.Status = defaultGuardianStatus(req.Status)
	if err := database.Transaction(func(tx *gorm.DB) error {
		user, err := upsertGuardianUser(tx, item.UserID, item.Name, item.Phone, defaultPasswordForPhone(item.Phone), item.Status)
		if err != nil {
			return err
		}
		item.UserID = user.Id.String()

		return tx.Save(&item).Error
	}); err != nil {
		return response.Error(c, err.Error())
	}

	return response.Success(c, item)
}

func Delete(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var item model.Profile
	if err := database.First(&item, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "家长不存在")
	}
	if err := ensureGuardianDeletable(database, item); err != nil {
		return response.Error(c, err.Error())
	}

	if err := database.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&item).Error; err != nil {
			return err
		}
		if strings.TrimSpace(item.UserID) != "" {
			var user userModel.User
			if err := tx.First(&user, "id = ?", item.UserID).Error; err != nil {
				if !errors.Is(err, gorm.ErrRecordNotFound) {
					return err
				}
			} else if shouldDeleteGuardianUser(user) {
				if err := tx.Delete(&user).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		return response.Error(c, "删除家长失败")
	}

	return response.Success(c, fiber.Map{"id": item.Id})
}

func defaultGuardianStatus(status string) string {
	if strings.TrimSpace(status) == "" {
		return "active"
	}

	return strings.TrimSpace(status)
}

func existsPhone(database *gorm.DB, phone string, currentID string) (bool, error) {
	var count int64
	query := database.Model(&model.Profile{}).Where("phone = ?", phone)
	if currentID != "" {
		query = query.Where("id <> ?", currentID)
	}

	if err := query.Count(&count).Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

func upsertGuardianUser(tx *gorm.DB, userID string, name string, phone string, password string, status string) (*userModel.User, error) {
	if exists, err := existsUserPhone(tx, phone, userID); err != nil {
		return nil, fiber.NewError(fiber.StatusInternalServerError, "校验家长账号失败")
	} else if exists {
		return nil, fiber.NewError(fiber.StatusBadRequest, "家长手机号已存在")
	}

	user := &userModel.User{}
	if strings.TrimSpace(userID) != "" {
		if err := tx.First(user, "id = ?", userID).Error; err != nil {
			return nil, fiber.NewError(fiber.StatusBadRequest, "家长账号不存在")
		}
	} else {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return nil, fiber.NewError(fiber.StatusInternalServerError, "密码加密失败")
		}
		user.DisplayName = name
		user.Phone = phone
		user.Password = string(hash)
		user.Roles = "guardian"
		user.Status = status
		if err := tx.Create(user).Error; err != nil {
			return nil, fiber.NewError(fiber.StatusBadRequest, "家长手机号已存在")
		}
		return user, nil
	}

	user.DisplayName = name
	user.Phone = phone
	user.Roles = normalizeGuardianRoles(user.Roles)
	user.Status = status
	if err := tx.Save(user).Error; err != nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, "家长手机号已存在")
	}

	return user, nil
}

func existsUserPhone(tx *gorm.DB, phone string, currentUserID string) (bool, error) {
	var count int64
	query := tx.Model(&userModel.User{}).Where("phone = ?", phone)
	if strings.TrimSpace(currentUserID) != "" {
		query = query.Where("id <> ?", currentUserID)
	}

	if err := query.Count(&count).Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

func normalizeGuardianRoles(raw string) string {
	parts := strings.Split(raw, ",")
	items := make([]string, 0, len(parts)+1)
	seen := map[string]struct{}{}

	for _, part := range parts {
		role := strings.TrimSpace(part)
		if role == "" {
			continue
		}
		if _, ok := seen[role]; ok {
			continue
		}
		seen[role] = struct{}{}
		items = append(items, role)
	}

	if _, ok := seen["guardian"]; !ok {
		items = append(items, "guardian")
	}

	return strings.Join(items, ",")
}

func shouldDeleteGuardianUser(user userModel.User) bool {
	parts := strings.Split(user.Roles, ",")
	roles := make([]string, 0, len(parts))
	for _, part := range parts {
		role := strings.TrimSpace(part)
		if role == "" {
			continue
		}
		roles = append(roles, role)
	}

	return len(roles) == 0 || (len(roles) == 1 && roles[0] == "guardian")
}

func ensureGuardianDeletable(database *gorm.DB, item model.Profile) error {
	var count int64
	if err := database.Model(&studentModel.Student{}).Where("guardian_id = ?", item.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验家长关联学生失败")
	}
	if count > 0 {
		return errors.New("家长已关联学生，不能删除")
	}

	query := database.Model(&guardianbindingModel.Binding{}).Where("guardian_phone = ?", item.Phone)
	if strings.TrimSpace(item.UserID) != "" {
		query = query.Or("guardian_user_id = ?", item.UserID)
	}
	if err := query.Count(&count).Error; err != nil {
		return errors.New("校验家长关联关系失败")
	}
	if count > 0 {
		return errors.New("家长已关联学生关系，不能删除")
	}

	return nil
}
