package overview

import (
	"time"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	campusModel "github.com/ydfk/edu-nexa/apps/api/internal/model/campus"
	homeworkrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	mealrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/mealrecord"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

func GetSummary(c *fiber.Ctx) error {
	today := time.Now().Format("2006-01-02")

	var activeCampusCount int64
	var studentCount int64
	var mealCompletedCount int64
	var homeworkCompletedCount int64

	db.DB.Model(&campusModel.Campus{}).Where("status = ?", "active").Count(&activeCampusCount)
	db.DB.Model(&studentModel.Student{}).Where("status = ?", "active").Count(&studentCount)
	db.DB.Model(&mealrecordModel.Record{}).
		Where("service_date = ? AND status = ?", today, "completed").
		Count(&mealCompletedCount)
	db.DB.Model(&homeworkrecordModel.Record{}).
		Where("service_date = ? AND status IN ?", today, []string{"completed", "partial"}).
		Count(&homeworkCompletedCount)

	return response.Success(c, fiber.Map{
		"date": today,
		"metrics": []fiber.Map{
			{"key": "activeCampusCount", "label": "启用校区", "value": activeCampusCount},
			{"key": "studentCount", "label": "托管学生", "value": studentCount},
			{"key": "mealCompletedCount", "label": "晚辅用餐已登记", "value": mealCompletedCount},
			{"key": "homeworkCompletedCount", "label": "作业完成已登记", "value": homeworkCompletedCount},
		},
		"alerts": []fiber.Map{
			{"level": "info", "title": "基础数据已切到真实表结构", "message": "可继续接学生、服务日历、每日作业和记录表单。"},
			{"level": "warning", "title": "图片与备注仍需补安全审核链路", "message": "小程序提审前需接入文本和多媒体内容安全能力。"},
		},
	})
}
