package overview

import (
	"time"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	homeworkrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	mealrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/mealrecord"
	schoolModel "github.com/ydfk/edu-nexa/apps/api/internal/model/school"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

func GetSummary(c *fiber.Ctx) error {
	today := time.Now().Format("2006-01-02")
	database := db.FromFiber(c)

	var activeSchoolCount int64
	var studentCount int64
	var mealCompletedCount int64
	var homeworkCompletedCount int64

	database.Model(&schoolModel.School{}).Where("status = ?", "active").Count(&activeSchoolCount)
	database.Model(&studentModel.Student{}).Where("status = ?", "active").Count(&studentCount)
	database.Model(&mealrecordModel.Record{}).
		Where("service_date = ? AND status = ?", today, "completed").
		Count(&mealCompletedCount)
	database.Model(&homeworkrecordModel.Record{}).
		Where("service_date = ? AND status IN ?", today, []string{"completed", "partial"}).
		Count(&homeworkCompletedCount)

	return response.Success(c, fiber.Map{
		"date": today,
		"metrics": []fiber.Map{
			{"key": "activeSchoolCount", "label": "学校", "value": activeSchoolCount},
			{"key": "studentCount", "label": "托管学生", "value": studentCount},
			{"key": "mealCompletedCount", "label": "晚辅用餐已登记", "value": mealCompletedCount},
			{"key": "homeworkCompletedCount", "label": "作业完成已登记", "value": homeworkCompletedCount},
		},
		"alerts": []fiber.Map{},
	})
}
