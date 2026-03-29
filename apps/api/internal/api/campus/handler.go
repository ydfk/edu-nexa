package campus

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"

	"github.com/gofiber/fiber/v2"
)

func List(c *fiber.Ctx) error {
	return response.Success(c, []fiber.Map{
		{
			"id":             "campus-nanhu",
			"name":           "南湖校区",
			"code":           "NH001",
			"contactPerson":  "李老师",
			"contactPhone":   "13800000001",
			"studentCount":   68,
			"staffCount":     9,
			"serviceStartAt": "17:30",
			"serviceEndAt":   "20:30",
			"status":         "active",
		},
		{
			"id":             "campus-jingkai",
			"name":           "经开校区",
			"code":           "JK001",
			"contactPerson":  "王老师",
			"contactPhone":   "13800000002",
			"studentCount":   58,
			"staffCount":     7,
			"serviceStartAt": "17:20",
			"serviceEndAt":   "20:10",
			"status":         "active",
		},
	})
}
