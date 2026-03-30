package adminseed

import (
	"fmt"
	"testing"

	userModel "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func TestEnsureDefaultAdminCreatesUserWithConfiguredPhone(t *testing.T) {
	originalConfig := config.Current
	originalDB := db.DB
	t.Cleanup(func() {
		config.Current = originalConfig
		db.DB = originalDB
	})

	testDB, err := openTestDB(t)
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}

	db.DB = testDB
	config.Current.AdminSeed = config.AdminSeedConfig{
		DisplayName: "默认管理员",
		Phone:       "13800000001",
		Password:    "EduNexa@123456",
	}

	if err := EnsureDefaultAdmin(); err != nil {
		t.Fatalf("ensure default admin: %v", err)
	}

	var user userModel.User
	if err := testDB.Where("phone = ?", "13800000001").First(&user).Error; err != nil {
		t.Fatalf("load created user: %v", err)
	}
	if user.Phone != "13800000001" {
		t.Fatalf("unexpected phone: %s", user.Phone)
	}
	if user.DisplayName != "默认管理员" {
		t.Fatalf("unexpected display name: %s", user.DisplayName)
	}
	if user.Roles != "admin" {
		t.Fatalf("unexpected roles: %s", user.Roles)
	}
	if user.Password == "" {
		t.Fatal("password should be hashed")
	}
}

func TestEnsureDefaultAdminResetsPasswordForExistingUser(t *testing.T) {
	originalConfig := config.Current
	originalDB := db.DB
	t.Cleanup(func() {
		config.Current = originalConfig
		db.DB = originalDB
	})

	testDB, err := openTestDB(t)
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}

	oldPassword, err := bcrypt.GenerateFromPassword([]byte("old-password"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash old password: %v", err)
	}

	existing := userModel.User{
		DisplayName: "默认管理员",
		Phone:       "13800000001",
		Roles:       "admin",
		Password:    string(oldPassword),
	}
	if err := testDB.Create(&existing).Error; err != nil {
		t.Fatalf("create existing user: %v", err)
	}

	db.DB = testDB
	config.Current.AdminSeed = config.AdminSeedConfig{
		DisplayName: "默认管理员",
		Phone:       "13800000001",
		Password:    "123456",
	}

	if err := EnsureDefaultAdmin(); err != nil {
		t.Fatalf("ensure default admin: %v", err)
	}

	var user userModel.User
	if err := testDB.Where("phone = ?", "13800000001").First(&user).Error; err != nil {
		t.Fatalf("load updated user: %v", err)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte("123456")); err != nil {
		t.Fatal("expected password to be reset from config")
	}
}

func openTestDB(t *testing.T) (*gorm.DB, error) {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	if err := testDB.AutoMigrate(&userModel.User{}); err != nil {
		return nil, err
	}

	return testDB, nil
}
