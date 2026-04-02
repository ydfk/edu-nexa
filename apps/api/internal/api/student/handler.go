package student

import (
	"errors"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	homeworkrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	mealrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/mealrecord"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	studentserviceModel "github.com/ydfk/edu-nexa/apps/api/internal/model/studentservice"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type studentPayload struct {
	CampusID      string `json:"campusId"`
	ClassID       string `json:"classId"`
	ClassName     string `json:"className"`
	Grade         string `json:"grade"`
	GradeID       string `json:"gradeId"`
	GuardianID    string `json:"guardianId"`
	GuardianName  string `json:"guardianName"`
	GuardianPhone string `json:"guardianPhone"`
	Name          string `json:"name"`
	SchoolID      string `json:"schoolId"`
	SchoolName    string `json:"schoolName"`
	Status        string `json:"status"`
}

func List(c *fiber.Ctx) error {
	var students []model.Student
	query := db.DB.Order("created_at desc")

	if keyword := strings.TrimSpace(c.Query("keyword")); keyword != "" {
		query = query.Where(
			"name LIKE ? OR school_name LIKE ? OR class_name LIKE ? OR guardian_name LIKE ? OR guardian_phone LIKE ?",
			"%"+keyword+"%",
			"%"+keyword+"%",
			"%"+keyword+"%",
			"%"+keyword+"%",
			"%"+keyword+"%",
		)
	}
	if schoolID := strings.TrimSpace(c.Query("schoolId")); schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}
	if classID := strings.TrimSpace(c.Query("classId")); classID != "" {
		query = query.Where("class_id = ?", classID)
	}
	if gradeID := strings.TrimSpace(c.Query("gradeId")); gradeID != "" {
		query = query.Where("grade_id = ?", gradeID)
	}
	if guardianID := strings.TrimSpace(c.Query("guardianId")); guardianID != "" {
		query = query.Where("guardian_id = ?", guardianID)
	}
	if guardianPhone := strings.TrimSpace(c.Query("guardianPhone")); guardianPhone != "" {
		query = query.Where("guardian_phone = ?", guardianPhone)
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&students).Error; err != nil {
		return response.Error(c, "查询学生失败")
	}

	studentIDs := make([]string, 0, len(students))
	for _, item := range students {
		studentIDs = append(studentIDs, item.Id.String())
	}

	serviceMap := make(map[string]studentserviceModel.Plan)
	if len(studentIDs) > 0 {
		var plans []studentserviceModel.Plan
		if err := db.DB.
			Where("student_id IN ?", studentIDs).
			Order("service_end_date desc, created_at desc").
			Find(&plans).Error; err == nil {
			for _, plan := range plans {
				if _, exists := serviceMap[plan.StudentID]; exists {
					continue
				}
				serviceMap[plan.StudentID] = plan
			}
		}
	}

	items := make([]fiber.Map, 0, len(students))
	for _, item := range students {
		plan, ok := serviceMap[item.Id.String()]
		serviceSummary := fiber.Map{}
		if ok {
			serviceSummary = fiber.Map{
				"paymentAmount":    plan.PaymentAmount,
				"paymentStatus":    plan.PaymentStatus,
				"paidAt":           plan.PaidAt,
				"serviceEndDate":   plan.ServiceEndDate,
				"serviceStartDate": plan.ServiceStartDate,
			}
		}

		items = append(items, fiber.Map{
			"campusId":       item.CampusID,
			"classId":        item.ClassID,
			"className":      item.ClassName,
			"grade":          item.Grade,
			"gradeId":        item.GradeID,
			"guardianId":     item.GuardianID,
			"guardianName":   item.GuardianName,
			"guardianPhone":  item.GuardianPhone,
			"id":             item.Id,
			"name":           item.Name,
			"schoolId":       item.SchoolID,
			"schoolName":     item.SchoolName,
			"serviceSummary": serviceSummary,
			"status":         item.Status,
		})
	}

	return response.Success(c, items)
}

func Create(c *fiber.Ctx) error {
	var req studentPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	if strings.TrimSpace(req.Name) == "" {
		return response.Error(c, "学生姓名不能为空")
	}
	if err := ensureStudentNameUnique(
		strings.TrimSpace(req.Name),
		strings.TrimSpace(req.GuardianID),
		strings.TrimSpace(req.GuardianPhone),
		"",
	); err != nil {
		return response.Error(c, err.Error())
	}

	student := model.Student{
		CampusID:      strings.TrimSpace(req.CampusID),
		ClassID:       strings.TrimSpace(req.ClassID),
		ClassName:     strings.TrimSpace(req.ClassName),
		Grade:         strings.TrimSpace(req.Grade),
		GradeID:       strings.TrimSpace(req.GradeID),
		GuardianID:    strings.TrimSpace(req.GuardianID),
		GuardianName:  strings.TrimSpace(req.GuardianName),
		GuardianPhone: strings.TrimSpace(req.GuardianPhone),
		Name:          strings.TrimSpace(req.Name),
		SchoolID:      strings.TrimSpace(req.SchoolID),
		SchoolName:    strings.TrimSpace(req.SchoolName),
		Status:        defaultStudentStatus(req.Status),
	}

	if err := db.DB.Create(&student).Error; err != nil {
		return response.Error(c, "创建学生失败")
	}

	return response.Success(c, student)
}

func Update(c *fiber.Ctx) error {
	var req studentPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if strings.TrimSpace(req.Name) == "" {
		return response.Error(c, "学生姓名不能为空")
	}

	var student model.Student
	if err := db.DB.First(&student, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "学生不存在")
	}
	if err := ensureStudentNameUnique(
		strings.TrimSpace(req.Name),
		strings.TrimSpace(req.GuardianID),
		strings.TrimSpace(req.GuardianPhone),
		student.Id.String(),
	); err != nil {
		return response.Error(c, err.Error())
	}

	student.ClassID = strings.TrimSpace(req.ClassID)
	student.ClassName = strings.TrimSpace(req.ClassName)
	student.CampusID = strings.TrimSpace(req.CampusID)
	student.Grade = strings.TrimSpace(req.Grade)
	student.GradeID = strings.TrimSpace(req.GradeID)
	student.GuardianID = strings.TrimSpace(req.GuardianID)
	student.GuardianName = strings.TrimSpace(req.GuardianName)
	student.GuardianPhone = strings.TrimSpace(req.GuardianPhone)
	student.Name = strings.TrimSpace(req.Name)
	student.SchoolID = strings.TrimSpace(req.SchoolID)
	student.SchoolName = strings.TrimSpace(req.SchoolName)
	student.Status = defaultStudentStatus(req.Status)

	if err := db.DB.Save(&student).Error; err != nil {
		return response.Error(c, "更新学生失败")
	}

	return response.Success(c, student)
}

func Delete(c *fiber.Ctx) error {
	var student model.Student
	if err := db.DB.First(&student, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "学生不存在")
	}
	if err := ensureStudentDeletable(student); err != nil {
		return response.Error(c, err.Error())
	}

	if err := db.DB.Delete(&student).Error; err != nil {
		return response.Error(c, "删除学生失败")
	}

	return response.Success(c, fiber.Map{"id": student.Id})
}

func defaultStudentStatus(status string) string {
	if strings.TrimSpace(status) == "" {
		return "active"
	}

	return strings.TrimSpace(status)
}

func ensureStudentNameUnique(name string, guardianID string, guardianPhone string, excludeID string) error {
	if guardianID == "" && guardianPhone == "" {
		return errors.New("家长不能为空")
	}

	var item model.Student
	query := db.DB.Where("LOWER(name) = LOWER(?)", name)
	if guardianID != "" {
		query = query.Where("guardian_id = ?", guardianID)
	} else {
		query = query.Where("guardian_phone = ?", guardianPhone)
	}
	if excludeID != "" {
		query = query.Where("id <> ?", excludeID)
	}

	if err := query.First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return errors.New("校验学生姓名失败")
	}

	return errors.New("同一家长下学生姓名不能重复")
}

func ensureStudentDeletable(student model.Student) error {
	var count int64
	if err := db.DB.Model(&studentserviceModel.Plan{}).Where("student_id = ?", student.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验学生关联服务计划失败")
	}
	if count > 0 {
		return errors.New("学生已关联服务计划，不能删除")
	}

	if err := db.DB.Model(&mealrecordModel.Record{}).Where("student_id = ?", student.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验学生关联用餐记录失败")
	}
	if count > 0 {
		return errors.New("学生已关联用餐记录，不能删除")
	}

	if err := db.DB.Model(&homeworkrecordModel.Record{}).Where("student_id = ?", student.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验学生关联作业记录失败")
	}
	if count > 0 {
		return errors.New("学生已关联作业记录，不能删除")
	}

	return nil
}
