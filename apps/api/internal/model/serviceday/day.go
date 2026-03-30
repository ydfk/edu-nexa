package serviceday

import "github.com/ydfk/edu-nexa/apps/api/internal/model/base"

type Day struct {
	base.BaseModel
	CampusID           string `gorm:"size:36;index;not null" json:"campusId"`
	ServiceDate        string `gorm:"size:10;index;not null" json:"serviceDate"`
	HasMealService     bool   `gorm:"default:false" json:"hasMealService"`
	HasHomeworkService bool   `gorm:"default:false" json:"hasHomeworkService"`
	Remark             string `gorm:"size:255" json:"remark"`
}
