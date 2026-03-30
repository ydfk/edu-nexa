package homeworkassignment

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	"github.com/ydfk/edu-nexa/apps/api/internal/service/contentsafety"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type assignmentPayload struct {
	CampusID    string `json:"campusId"`
	ClassName   string `json:"className"`
	Content     string `json:"content"`
	Remark      string `json:"remark"`
	SchoolName  string `json:"schoolName"`
	ServiceDate string `json:"serviceDate"`
	TeacherID   string `json:"teacherId"`
	TeacherName string `json:"teacherName"`
}

func List(c *fiber.Ctx) error {
	var assignments []model.Assignment
	query := db.DB.Order("service_date desc, created_at desc")

	if campusID := c.Query("campusId"); campusID != "" {
		query = query.Where("campus_id = ?", campusID)
	}
	if schoolName := c.Query("schoolName"); schoolName != "" {
		query = query.Where("school_name = ?", schoolName)
	}
	if className := c.Query("className"); className != "" {
		query = query.Where("class_name = ?", className)
	}
	if serviceDate := c.Query("serviceDate"); serviceDate != "" {
		query = query.Where("service_date = ?", serviceDate)
	}
	if dateFrom := c.Query("dateFrom"); dateFrom != "" {
		query = query.Where("service_date >= ?", dateFrom)
	}
	if dateTo := c.Query("dateTo"); dateTo != "" {
		query = query.Where("service_date <= ?", dateTo)
	}

	if err := query.Find(&assignments).Error; err != nil {
		return response.Error(c, "查询每日作业失败")
	}

	return response.Success(c, assignments)
}

func Create(c *fiber.Ctx) error {
	var req assignmentPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if req.CampusID == "" || req.ServiceDate == "" || req.SchoolName == "" || req.ClassName == "" {
		return response.Error(c, "校区、日期、学校和班级不能为空")
	}
	if err := contentsafety.CheckText(req.Content + "\n" + req.Remark); err != nil {
		return response.Error(c, err.Error())
	}

	assignment := model.Assignment{
		CampusID:    req.CampusID,
		ClassName:   req.ClassName,
		Content:     req.Content,
		Remark:      req.Remark,
		SchoolName:  req.SchoolName,
		ServiceDate: req.ServiceDate,
		TeacherID:   req.TeacherID,
		TeacherName: req.TeacherName,
	}

	if err := db.DB.Create(&assignment).Error; err != nil {
		return response.Error(c, "创建每日作业失败")
	}

	return response.Success(c, assignment)
}

func Update(c *fiber.Ctx) error {
	var req assignmentPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var assignment model.Assignment
	if err := db.DB.First(&assignment, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "每日作业不存在")
	}
	if err := contentsafety.CheckText(req.Content + "\n" + req.Remark); err != nil {
		return response.Error(c, err.Error())
	}

	assignment.CampusID = req.CampusID
	assignment.ClassName = req.ClassName
	assignment.Content = req.Content
	assignment.Remark = req.Remark
	assignment.SchoolName = req.SchoolName
	assignment.ServiceDate = req.ServiceDate
	assignment.TeacherID = req.TeacherID
	assignment.TeacherName = req.TeacherName

	if err := db.DB.Save(&assignment).Error; err != nil {
		return response.Error(c, "更新每日作业失败")
	}

	return response.Success(c, assignment)
}
