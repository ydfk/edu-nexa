package homeworkrecord

import (
	"errors"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	assignmentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	"github.com/ydfk/edu-nexa/apps/api/internal/service"
	"github.com/ydfk/edu-nexa/apps/api/internal/service/contentsafety"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type homeworkRecordPayload struct {
	CampusID      string   `json:"campusId"`
	AssignmentID   string   `json:"assignmentId"`
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
	Subject        string   `json:"subject"`
	SubjectSummary string   `json:"subjectSummary"`
}

func List(c *fiber.Ctx) error {
	var records []model.Record
	database := db.FromFiber(c)
	query := database.Order("service_date desc, created_at desc")

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
	database := db.FromFiber(c)
	var req homeworkRecordPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if err := validateHomeworkRecordPayload(req); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	student, err := findHomeworkStudent(database, req.StudentID, "")
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	assignment, err := findHomeworkAssignment(database, req, student)
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := ensureHomeworkRecordUniqueWithDB(database, student.Id.String(), req.ServiceDate, assignment.Subject, assignment.Id.String(), ""); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := contentsafety.CheckText(req.Remark + "\n" + req.SubjectSummary); err != nil {
		return response.Error(c, err.Error())
	}

	record := model.Record{
		CampusID:      strings.TrimSpace(req.CampusID),
		AssignmentID:   assignment.Id.String(),
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
		Subject:        assignment.Subject,
		SubjectSummary: buildHomeworkSubjectSummary(req.SubjectSummary, assignment),
	}

	if err := database.Create(&record).Error; err != nil {
		return response.Error(c, "创建作业记录失败")
	}

	return response.Success(c, buildHomeworkRecordPayload(record))
}

func Update(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var req homeworkRecordPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var record model.Record
	if err := database.First(&record, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "作业记录不存在")
	}
	if err := validateHomeworkRecordPayload(req); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	student, err := findHomeworkStudent(database, req.StudentID, record.StudentID)
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	assignment, err := findHomeworkAssignment(database, req, student)
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := ensureHomeworkRecordUniqueWithDB(database, student.Id.String(), req.ServiceDate, assignment.Subject, assignment.Id.String(), record.Id.String()); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := contentsafety.CheckText(req.Remark + "\n" + req.SubjectSummary); err != nil {
		return response.Error(c, err.Error())
	}

	record.CampusID = strings.TrimSpace(req.CampusID)
	record.AssignmentID = assignment.Id.String()
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
	record.Subject = assignment.Subject
	record.SubjectSummary = buildHomeworkSubjectSummary(req.SubjectSummary, assignment)

	if err := database.Save(&record).Error; err != nil {
		return response.Error(c, "更新作业记录失败")
	}

	return response.Success(c, buildHomeworkRecordPayload(record))
}

func Delete(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var record model.Record
	if err := database.First(&record, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "作业记录不存在")
	}

	if err := database.Delete(&record).Error; err != nil {
		return response.Error(c, "删除作业记录失败")
	}

	return response.Success(c, fiber.Map{"id": record.Id})
}

func buildHomeworkRecordPayload(item model.Record) fiber.Map {
	return fiber.Map{
		"campusId":       item.CampusID,
		"assignmentId":   item.AssignmentID,
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
		"subject":        item.Subject,
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
	switch strings.TrimSpace(status) {
	case "completed", "partial", "pending":
		return strings.TrimSpace(status)
	default:
		return "pending"
	}
}

func validateHomeworkRecordPayload(req homeworkRecordPayload) error {
	if strings.TrimSpace(req.StudentID) == "" {
		return errors.New("学生不能为空")
	}
	if strings.TrimSpace(req.ServiceDate) == "" {
		return errors.New("日期不能为空")
	}
	if strings.TrimSpace(req.AssignmentID) == "" && strings.TrimSpace(req.Subject) == "" {
		return errors.New("作业科目不能为空")
	}

	return nil
}

func findHomeworkStudent(database *gorm.DB, studentID string, currentStudentID string) (*studentModel.Student, error) {
	var item studentModel.Student
	if err := database.First(&item, "id = ?", strings.TrimSpace(studentID)).Error; err != nil {
		return nil, errors.New("学生不存在")
	}
	if strings.TrimSpace(currentStudentID) != item.Id.String() && !service.IsActiveStatus(item.Status) {
		return nil, errors.New("学生已禁用")
	}

	return &item, nil
}

func findHomeworkAssignment(database *gorm.DB, req homeworkRecordPayload, student *studentModel.Student) (*assignmentModel.Assignment, error) {
	assignmentID := strings.TrimSpace(req.AssignmentID)
	subject := strings.TrimSpace(req.Subject)
	serviceDate := strings.TrimSpace(req.ServiceDate)

	query := database.Model(&assignmentModel.Assignment{})
	var item assignmentModel.Assignment

	if assignmentID != "" {
		if err := query.First(&item, "id = ?", assignmentID).Error; err != nil {
			return nil, errors.New("每日作业不存在")
		}
	} else {
		query = query.Where("service_date = ? AND subject = ?", serviceDate, subject)
		if student.ClassID != "" {
			query = query.Where("class_id = ?", student.ClassID)
		} else {
			query = query.Where("school_name = ? AND class_name = ?", student.SchoolName, student.ClassName)
		}
		if err := query.First(&item).Error; err != nil {
			return nil, errors.New("请先创建当天该科目的每日作业")
		}
	}

	if item.ServiceDate != serviceDate {
		return nil, errors.New("请先创建当天该科目的每日作业")
	}
	if item.ClassID != "" && student.ClassID != "" && item.ClassID != student.ClassID {
		return nil, errors.New("作业不属于当前学生班级")
	}
	if item.ClassID == "" && (item.SchoolName != student.SchoolName || item.ClassName != student.ClassName) {
		return nil, errors.New("作业不属于当前学生班级")
	}
	if subject != "" && strings.TrimSpace(item.Subject) != subject {
		return nil, errors.New("作业科目不匹配")
	}

	return &item, nil
}

func ensureHomeworkRecordUnique(studentID string, serviceDate string, subject string, assignmentID string, excludeID string) error {
	return ensureHomeworkRecordUniqueWithDB(db.DB, studentID, serviceDate, subject, assignmentID, excludeID)
}

func ensureHomeworkRecordUniqueWithDB(database *gorm.DB, studentID string, serviceDate string, subject string, assignmentID string, excludeID string) error {
	var records []model.Record
	if err := database.Where("student_id = ? AND service_date = ?", studentID, serviceDate).Find(&records).Error; err != nil {
		return errors.New("校验作业记录失败")
	}

	trimmedSubject := strings.TrimSpace(subject)
	trimmedAssignmentID := strings.TrimSpace(assignmentID)
	for _, item := range records {
		if excludeID != "" && item.Id.String() == excludeID {
			continue
		}
		if strings.TrimSpace(item.Subject) == trimmedSubject && trimmedSubject != "" {
			return errors.New("同一个学生同一天同一科目只能有一条作业记录")
		}
		if strings.TrimSpace(item.Subject) == "" &&
			((trimmedAssignmentID != "" && strings.TrimSpace(item.AssignmentID) == trimmedAssignmentID) ||
				strings.TrimSpace(item.SubjectSummary) == trimmedSubject) {
			return errors.New("同一个学生同一天同一科目只能有一条作业记录")
		}
	}

	return nil
}

func buildHomeworkSubjectSummary(raw string, assignment *assignmentModel.Assignment) string {
	summary := strings.TrimSpace(raw)
	if summary != "" {
		return summary
	}
	if assignment == nil {
		return ""
	}
	return strings.TrimSpace(assignment.Content)
}
