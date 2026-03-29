package overview

import (
	"time"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"

	"github.com/gofiber/fiber/v2"
)

func GetSummary(c *fiber.Ctx) error {
	return response.Success(c, fiber.Map{
		"date": time.Now().Format("2006-01-02"),
		"metrics": []fiber.Map{
			{"key": "activeCampusCount", "label": "启用校区", "value": 2},
			{"key": "studentCount", "label": "托管学生", "value": 126},
			{"key": "mealCompletedCount", "label": "晚辅用餐已登记", "value": 98},
			{"key": "homeworkCompletedCount", "label": "作业完成已登记", "value": 83},
		},
		"alerts": []fiber.Map{
			{"level": "warning", "title": "仍有学生未登记晚餐", "message": "南湖校区还有 12 名学生未确认用餐状态。"},
			{"level": "info", "title": "作业反馈待同步家长", "message": "今天已有 37 条作业记录可推送到家长端。"},
		},
	})
}
