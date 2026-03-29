package mealrecord

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"

	"github.com/gofiber/fiber/v2"
)

func List(c *fiber.Ctx) error {
	return response.Success(c, []fiber.Map{
		{
			"id":          "meal-20260329-001",
			"studentId":   "student-001",
			"studentName": "陈一鸣",
			"campusName":  "南湖校区",
			"serviceDate": "2026-03-29",
			"status":      "completed",
			"remark":      "正常用餐",
			"recordedBy":  "李老师",
		},
		{
			"id":          "meal-20260329-002",
			"studentId":   "student-002",
			"studentName": "赵可欣",
			"campusName":  "经开校区",
			"serviceDate": "2026-03-29",
			"status":      "leave",
			"remark":      "请假未到校",
			"recordedBy":  "王老师",
		},
	})
}
