package homeworkrecord

import (
	"errors"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	"github.com/ydfk/edu-nexa/apps/api/internal/service"
	"github.com/ydfk/edu-nexa/apps/api/internal/service/contentsafety"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type homeworkRecordPayload struct {
	CampusID      string   `json:"campusId"`
	ClassName      string   `json:"className"`
	ImageURLs      []string `json:"imageUrls"`
	RecordedBy     string   `json:"recordedBy"`
	RecordedByID   string   `json:"recordedById"`
	Remark         string   `json:"remark"`
	SchoolName     string   `json:"schoolName"`
	ServiceDate    string   `json:"serviceDate"`
	Status         string   `json:"status"`
	StudentID      string   `json:"studentId"`
	StudentName    string   `json:"studentName"`
	SubjectSummary string   `json:"subjectSummary"`
}

func List(c *fiber.Ctx) error {
	var records []model.Record
	query := db.DB.Order("service_date desc, created_at desc")

	if studentID := c.Query("studentId"); studentID != "" {
		query = query.Where("student_id = ?", studentID)
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

	if err := query.Find(&records).Error; err != nil {
		return response.Error(c, "查询作业记录失败")
	}

	items := make([]fiber.Map, 0, len(records))
	for _, item := range records {
		items = append(items, buildHomeworkRecordPayload(item))
	}

	return response.Success(c, items)
}

func Create(c *fiber.Ctx) error {
	var req homeworkRecordPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if err := validateHomeworkRecordPayload(req); err != nil {
		return response.Error(c, err.Error())
	}
	student, err := findHomeworkStudent(req.StudentID, "")
	if err != nil {
		return response.Error(c, err.Error())
	}
	if err := contentsafety.CheckText(req.Remark + "\n" + req.SubjectSummary); err != nil {
		return response.Error(c, err.Error())
	}

	record := model.Record{
		CampusID:      strings.TrimSpace(req.CampusID),
		ClassName:      student.ClassName,
		ImageURLs:      strings.Join(req.ImageURLs, ","),
		RecordedBy:     req.RecordedBy,
		RecordedByID:   req.RecordedByID,
		Remark:         req.Remark,
		SchoolName:     student.SchoolName,
		ServiceDate:    req.ServiceDate,
		Status:         defaultHomeworkStatus(req.Status),
		StudentID:      student.Id.String(),
		StudentName:    student.Name,
		SubjectSummary: req.SubjectSummary,
	}

	if err := db.DB.Create(&record).Error; err != nil {
		return response.Error(c, "创建作业记录失败")
	}

	return response.Success(c, buildHomeworkRecordPayload(record))
}

func Update(c *fiber.Ctx) error {
	var req homeworkRecordPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var record model.Record
	if err := db.DB.First(&record, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "作业记录不存在")
	}
	if err := validateHomeworkRecordPayload(req); err != nil {
		return response.Error(c, err.Error())
	}
	student, err := findHomeworkStudent(req.StudentID, record.StudentID)
	if err != nil {
		return response.Error(c, err.Error())
	}
	if err := contentsafety.CheckText(req.Remark + "\n" + req.SubjectSummary); err != nil {
		return response.Error(c, err.Error())
	}

	record.CampusID = strings.TrimSpace(req.CampusID)
	record.ClassName = student.ClassName
	record.ImageURLs = strings.Join(req.ImageURLs, ",")
	record.RecordedBy = req.RecordedBy
	record.RecordedByID = req.RecordedByID
	record.Remark = req.Remark
	record.SchoolName = student.SchoolName
	record.ServiceDate = req.ServiceDate
	record.Status = defaultHomeworkStatus(req.Status)
	record.StudentID = student.Id.String()
	record.StudentName = student.Name
	record.SubjectSummary = req.SubjectSummary

	if err := db.DB.Save(&record).Error; err != nil {
		return response.Error(c, "更新作业记录失败")
	}

	return response.Success(c, buildHomeworkRecordPayload(record))
}

func Delete(c *fiber.Ctx) error {
	var record model.Record
	if err := db.DB.First(&record, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "作业记录不存在")
	}

	if err := db.DB.Delete(&record).Error; err != nil {
		return response.Error(c, "删除作业记录失败")
	}

	return response.Success(c, fiber.Map{"id": record.Id})
}

func buildHomeworkRecordPayload(item model.Record) fiber.Map {
	return fiber.Map{
		"campusId":       item.CampusID,
		"className":      item.ClassName,
		"id":             item.Id,
		"imageUrls":      splitHomeworkCommaField(item.ImageURLs),
		"recordedBy":     item.RecordedBy,
		"recordedById":   item.RecordedByID,
		"remark":         item.Remark,
		"schoolName":     item.SchoolName,
		"serviceDate":    item.ServiceDate,
		"status":         item.Status,
		"studentId":      item.StudentID,
		"studentName":    item.StudentName,
		"subjectSummary": item.SubjectSummary,
	}
}

func splitHomeworkCommaField(raw string) []string {
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

func defaultHomeworkStatus(status string) string {
	if status == "" {
		return "pending"
	}

	return status
}

func validateHomeworkRecordPayload(req homeworkRecordPayload) error {
	if strings.TrimSpace(req.StudentID) == "" {
		return errors.New("学生不能为空")
	}
	if strings.TrimSpace(req.ServiceDate) == "" {
		return errors.New("日期不能为空")
	}

	return nil
}

func findHomeworkStudent(studentID string, currentStudentID string) (*studentModel.Student, error) {
	var item studentModel.Student
	if err := db.DB.First(&item, "id = ?", strings.TrimSpace(studentID)).Error; err != nil {
		return nil, errors.New("学生不存在")
	}
	if strings.TrimSpace(currentStudentID) != item.Id.String() && !service.IsActiveStatus(item.Status) {
		return nil, errors.New("学生已禁用")
	}

	return &item, nil
}
