package db

import (
	"fmt"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/logger"
	"github.com/ydfk/edu-nexa/apps/api/pkg/util"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"moul.io/zapgorm2"
)

var DB *gorm.DB

func Init() error {
	dialector, err := buildDialector()
	if err != nil {
		return err
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: zapgorm2.New(logger.Logger.Desugar()),
	})
	if err != nil {
		return err
	}

	DB = db
	if err := autoMigrate(); err != nil {
		return fmt.Errorf("数据库迁移失败: %v", err)
	}

	return nil
}

func buildDialector() (gorm.Dialector, error) {
	driver := strings.TrimSpace(strings.ToLower(config.Current.Database.Driver))
	if driver == "" || driver == "sqlite" {
		path := strings.TrimSpace(config.Current.Database.Path)
		if path == "" {
			return nil, fmt.Errorf("sqlite 数据库路径不能为空")
		}
		if err := util.EnsureDir(path); err != nil {
			logger.Error("创建数据库目录失败: %w", err)
			return nil, err
		}
		return sqlite.Open(path), nil
	}

	if driver == "postgres" || driver == "postgresql" || driver == "pgsql" {
		dsn := strings.TrimSpace(config.Current.Database.DSN)
		if dsn == "" {
			return nil, fmt.Errorf("postgres 数据库 dsn 不能为空")
		}
		return postgres.Open(dsn), nil
	}

	return nil, fmt.Errorf("不支持的数据库驱动: %s", driver)
}
