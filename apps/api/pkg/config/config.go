package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	App       AppConfig
	Jwt       JwtConfig
	Database  DatabaseConfig
	Storage   StorageConfig
	Wechat    WechatConfig
	AdminSeed AdminSeedConfig `mapstructure:"admin_seed"`
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

type StorageConfig struct {
	DefaultProvider string             `mapstructure:"default_provider"`
	Local           LocalStorageConfig `mapstructure:"local"`
	AliyunOSS       AliyunOSSConfig    `mapstructure:"aliyun_oss"`
	UpYun           UpYunConfig        `mapstructure:"upyun"`
}

type LocalStorageConfig struct {
	BaseURL    string `mapstructure:"base_url"`
	Dir        string `mapstructure:"dir"`
	PublicPath string `mapstructure:"public_path"`
}

type AliyunOSSConfig struct {
	AccessKeyID     string `mapstructure:"access_key_id"`
	AccessKeySecret string `mapstructure:"access_key_secret"`
	BaseURL         string `mapstructure:"base_url"`
	Bucket          string `mapstructure:"bucket"`
	Endpoint        string `mapstructure:"endpoint"`
	PathPrefix      string `mapstructure:"path_prefix"`
	Region          string `mapstructure:"region"`
}

type UpYunConfig struct {
	APIHost       string `mapstructure:"api_host"`
	BaseURL       string `mapstructure:"base_url"`
	Bucket        string `mapstructure:"bucket"`
	FormAPISecret string `mapstructure:"form_api_secret"`
	PathPrefix    string `mapstructure:"path_prefix"`
}

type WechatConfig struct {
	AppID     string `mapstructure:"app_id"`
	AppSecret string `mapstructure:"app_secret"`
	DevPhone  string `mapstructure:"dev_phone"`
}

type AdminSeedConfig struct {
	DisplayName string `mapstructure:"display_name"`
	Password    string `mapstructure:"password"`
	Phone       string `mapstructure:"phone"`
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
