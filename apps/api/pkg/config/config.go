package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	App      AppConfig
	Jwt      JwtConfig
	Database DatabaseConfig
	Wechat   WechatConfig
}

type AppConfig struct {
	Port string `mapstructure:"port"`
	Env  string `mapstructure:"env"`
}

type JwtConfig struct {
	Secret     string `mapstructure:"secret"`
	Expiration int    `mapstructure:"expiration"`
}

type DatabaseConfig struct {
	Path string `mapstructure:"path"`
}

type WechatConfig struct {
	AppID     string `mapstructure:"app_id"`
	AppSecret string `mapstructure:"app_secret"`
	DevPhone  string `mapstructure:"dev_phone"`
}

var Current Config
var IsProduction bool

func Init() error {
	viper.SetConfigFile("config/config.yaml")
	if err := viper.ReadInConfig(); err != nil {
		return err
	}

	if err := viper.Unmarshal(&Current); err != nil {
		return err
	}

	IsProduction = Current.App.Env == "production"

	return nil
}
