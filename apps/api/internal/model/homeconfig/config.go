package homeconfig

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Config struct {
	base.BaseModel
	Scene        string `gorm:"size:32;uniqueIndex;not null" json:"scene"`
	HeroTitle    string `gorm:"size:128" json:"heroTitle"`
	HeroSubtitle string `gorm:"size:255" json:"heroSubtitle"`
	Announcement string `gorm:"size:255" json:"announcement"`
	BannersJSON  string `gorm:"type:text" json:"-"`
}

func (Config) TableName() string {
	return "home_configs"
}
