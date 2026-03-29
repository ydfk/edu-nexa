package homeworkrecord

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"

	"github.com/gofiber/fiber/v2"
)

func List(c *fiber.Ctx) error {
	return response.Success(c, []fiber.Map{
		{
			"id":          "homework-20260329-001",
			"studentId":   "student-001",
			"studentName": "陈一鸣",
			"campusName":  "南湖校区",
			"serviceDate": "2026-03-29",
			"status":      "completed",
			"remark":      "语文、数学已完成，英语已订正",
			"recordedBy":  "李老师",
		},
		{
			"id":          "homework-20260329-002",
			"studentId":   "student-002",
			"studentName": "赵可欣",
			"campusName":  "经开校区",
			"serviceDate": "2026-03-29",
			"status":      "pending_parent_followup",
			"remark":      "口算题需要回家继续完成",
			"recordedBy":  "王老师",
		},
	})
}
