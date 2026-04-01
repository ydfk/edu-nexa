package serviceday

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Day struct {
	base.BaseModel
	ServiceDate                string `gorm:"size:10;index;not null" json:"serviceDate"`
	HasMealService             bool   `gorm:"default:false" json:"hasMealService"`
	HasHomeworkService         bool   `gorm:"default:false" json:"hasHomeworkService"`
	HasLunchService            bool   `gorm:"default:false" json:"hasLunchService"`
	HasDinnerService           bool   `gorm:"default:false" json:"hasDinnerService"`
	HasDaytimeHomeworkService  bool   `gorm:"default:false" json:"hasDaytimeHomeworkService"`
	HasEveningHomeworkService  bool   `gorm:"default:false" json:"hasEveningHomeworkService"`
	WorkHours                  string `gorm:"size:64" json:"workHours"`
	Remark                     string `gorm:"size:255" json:"remark"`
}
