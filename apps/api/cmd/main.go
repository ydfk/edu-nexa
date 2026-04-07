// @title EduNexa API
// @version 1.0
// @description EduNexa 托管服务 API
// @host localhost:33001
// @BasePath /api
package main

import (
	_ "github.com/ydfk/edu-nexa/apps/api/docs"
	"github.com/ydfk/edu-nexa/apps/api/internal/service/adminseed"
	"github.com/ydfk/edu-nexa/apps/api/pkg/buildinfo"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"github.com/ydfk/edu-nexa/apps/api/pkg/logger"
)

func main() {
	if err := logger.Init(); err != nil {
		panic(err)
	}

	if err := config.Init(); err != nil {
		logger.Fatal("加载配置失败: %v", err)
	}

	if err := db.Init(); err != nil {
		logger.Fatal("初始化数据库失败: %v", err)
	}
	if err := adminseed.EnsureDefaultAdmin(); err != nil {
		logger.Fatal("初始化默认管理员失败: %v", err)
	}

	logger.Info("当前服务版本: %s", buildinfo.Version())

	api()
}
