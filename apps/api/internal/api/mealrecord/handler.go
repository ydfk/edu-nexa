package mealrecord

import (
	"errors"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/mealrecord"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	"github.com/ydfk/edu-nexa/apps/api/internal/service"
	"github.com/ydfk/edu-nexa/apps/api/internal/service/contentsafety"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type mealRecordPayload struct {
	CampusID     string   `json:"campusId"`
	ImageURLs    []string `json:"imageUrls"`
	RecordedBy   string   `json:"recordedBy"`
	RecordedByID string   `json:"recordedById"`
	Remark       string   `json:"remark"`
	ServiceDate  string   `json:"serviceDate"`
	Status       string   `json:"status"`
	StudentID    string   `json:"studentId"`
	StudentName  string   `json:"studentName"`
}

func List(c *fiber.Ctx) error {
	var records []model.Record
	query := db.DB.Order("service_date desc, created_at desc")

	if studentID := c.Query("studentId"); studentID != "" {
		query = query.Where("student_id = ?", studentID)
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

	if err := query.Find(&records).Error; err != nil {
		return response.Error(c, "查询用餐记录失败")
	}

	items := make([]fiber.Map, 0, len(records))
	for _, item := range records {
		items = append(items, buildMealRecordPayload(item))
	}

	return response.Success(c, items)
}

func Create(c *fiber.Ctx) error {
	var req mealRecordPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if err := validateMealRecordPayload(req); err != nil {
		return response.Error(c, err.Error())
	}
	student, err := findMealStudent(req.StudentID, "")
	if err != nil {
		return response.Error(c, err.Error())
	}
	if err := contentsafety.CheckText(req.Remark); err != nil {
		return response.Error(c, err.Error())
	}

	record := model.Record{
		CampusID:     strings.TrimSpace(req.CampusID),
		ImageURLs:    strings.Join(req.ImageURLs, ","),
		RecordedBy:   req.RecordedBy,
		RecordedByID: req.RecordedByID,
		Remark:       req.Remark,
		ServiceDate:  req.ServiceDate,
		Status:       defaultMealStatus(req.Status),
		StudentID:    student.Id.String(),
		StudentName:  student.Name,
	}

	if err := db.DB.Create(&record).Error; err != nil {
		return response.Error(c, "创建用餐记录失败")
	}

	return response.Success(c, buildMealRecordPayload(record))
}

func Update(c *fiber.Ctx) error {
	var req mealRecordPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var record model.Record
	if err := db.DB.First(&record, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "用餐记录不存在")
	}
	if err := validateMealRecordPayload(req); err != nil {
		return response.Error(c, err.Error())
	}
	student, err := findMealStudent(req.StudentID, record.StudentID)
	if err != nil {
		return response.Error(c, err.Error())
	}
	if err := contentsafety.CheckText(req.Remark); err != nil {
		return response.Error(c, err.Error())
	}

	record.CampusID = strings.TrimSpace(req.CampusID)
	record.ImageURLs = strings.Join(req.ImageURLs, ",")
	record.RecordedBy = req.RecordedBy
	record.RecordedByID = req.RecordedByID
	record.Remark = req.Remark
	record.ServiceDate = req.ServiceDate
	record.Status = defaultMealStatus(req.Status)
	record.StudentID = student.Id.String()
	record.StudentName = student.Name

	if err := db.DB.Save(&record).Error; err != nil {
		return response.Error(c, "更新用餐记录失败")
	}

	return response.Success(c, buildMealRecordPayload(record))
}

func Delete(c *fiber.Ctx) error {
	var record model.Record
	if err := db.DB.First(&record, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "用餐记录不存在")
	}

	if err := db.DB.Delete(&record).Error; err != nil {
		return response.Error(c, "删除用餐记录失败")
	}

	return response.Success(c, fiber.Map{"id": record.Id})
}

func buildMealRecordPayload(item model.Record) fiber.Map {
	return fiber.Map{
		"campusId":     item.CampusID,
		"id":           item.Id,
		"imageUrls":    splitCommaField(item.ImageURLs),
		"recordedBy":   item.RecordedBy,
		"recordedById": item.RecordedByID,
		"remark":       item.Remark,
		"serviceDate":  item.ServiceDate,
		"status":       item.Status,
		"studentId":    item.StudentID,
		"studentName":  item.StudentName,
	}
}

func splitCommaField(raw string) []string {
	if raw == "" {
		return []string{}
	}

	parts := strings.Split(raw, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		items = append(items, value)
	}

	return items
}

func defaultMealStatus(status string) string {
	if status == "" {
		return "pending"
	}

	return status
}

func validateMealRecordPayload(req mealRecordPayload) error {
	if strings.TrimSpace(req.StudentID) == "" {
		return errors.New("学生不能为空")
	}
	if strings.TrimSpace(req.ServiceDate) == "" {
		return errors.New("日期不能为空")
	}

	return nil
}

func findMealStudent(studentID string, currentStudentID string) (*studentModel.Student, error) {
	var item studentModel.Student
	if err := db.DB.First(&item, "id = ?", strings.TrimSpace(studentID)).Error; err != nil {
		return nil, errors.New("学生不存在")
	}
	if strings.TrimSpace(currentStudentID) != item.Id.String() && !service.IsActiveStatus(item.Status) {
		return nil, errors.New("学生已禁用")
	}

	return &item, nil
}
