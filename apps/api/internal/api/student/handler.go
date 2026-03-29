package student

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"

	"github.com/gofiber/fiber/v2"
)

func List(c *fiber.Ctx) error {
	return response.Success(c, []fiber.Map{
		{
			"campusId":       "campus-nanhu",
			"campusName":     "南湖校区",
			"grade":          "三年级",
			"guardianName":   "陈女士",
			"guardianPhone":  "13900000001",
			"id":             "student-001",
			"homeworkStatus": "completed",
			"mealStatus":     "completed",
			"name":           "陈一鸣",
			"schoolName":     "南湖小学",
		},
		{
			"campusId":       "campus-jingkai",
			"campusName":     "经开校区",
			"grade":          "四年级",
			"guardianName":   "赵先生",
			"guardianPhone":  "13900000002",
			"id":             "student-002",
			"homeworkStatus": "in_progress",
			"mealStatus":     "pending",
			"name":           "赵可欣",
			"schoolName":     "经开实验小学",
		},
	})
}
