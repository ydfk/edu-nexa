package db

import (
	"fmt"
	"os"
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
var DemoDB *gorm.DB

const demoDatabasePath = "data/demo.sqlite"

func Init() error {
	dialector, err := buildDialectorForConfig(config.Current.Database)
	if err != nil {
		return err
	}

	mainDB, err := gorm.Open(dialector, &gorm.Config{
		Logger: zapgorm2.New(logger.Logger.Desugar()),
	})
	if err != nil {
		return err
	}

	DB = mainDB
	if err := autoMigrateFor(DB); err != nil {
		return fmt.Errorf("数据库迁移失败: %v", err)
	}

	if err := initDemoDatabase(); err != nil {
		return err
	}

	return nil
}

func initDemoDatabase() error {
	dialector, err := buildDialectorForConfig(config.DatabaseConfig{
		Driver: "sqlite",
		Path:   demoDatabasePath,
	})
	if err != nil {
		return err
	}

	database, err := gorm.Open(dialector, &gorm.Config{
		Logger: zapgorm2.New(logger.Logger.Desugar()),
	})
	if err != nil {
		return err
	}
	if err := autoMigrateFor(database); err != nil {
		return fmt.Errorf("demo 数据库迁移失败: %v", err)
	}

	DemoDB = database

	return nil
}

func ResetDemoDatabase() error {
	if DemoDB != nil {
		if sqlDB, err := DemoDB.DB(); err == nil {
			_ = sqlDB.Close()
		}
		DemoDB = nil
	}

	if err := os.Remove(demoDatabasePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("重置 demo 数据库失败: %w", err)
	}

	return initDemoDatabase()
}

func buildDialector() (gorm.Dialector, error) {
	return buildDialectorForConfig(config.Current.Database)
}

func buildDialectorForConfig(databaseConfig config.DatabaseConfig) (gorm.Dialector, error) {
	driver := strings.TrimSpace(strings.ToLower(databaseConfig.Driver))
	if driver == "" || driver == "sqlite" {
		path := strings.TrimSpace(databaseConfig.Path)
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
		dsn := strings.TrimSpace(databaseConfig.DSN)
		if dsn == "" {
			return nil, fmt.Errorf("postgres 数据库 dsn 不能为空")
		}
		return postgres.Open(dsn), nil
	}

	return nil, fmt.Errorf("不支持的数据库驱动: %s", driver)
}
