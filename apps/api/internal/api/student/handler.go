package student

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	campusModel "github.com/ydfk/edu-nexa/apps/api/internal/model/campus"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	studentserviceModel "github.com/ydfk/edu-nexa/apps/api/internal/model/studentservice"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type studentPayload struct {
	CampusID      string `json:"campusId"`
	ClassName     string `json:"className"`
	Grade         string `json:"grade"`
	GuardianName  string `json:"guardianName"`
	GuardianPhone string `json:"guardianPhone"`
	Name          string `json:"name"`
	SchoolName    string `json:"schoolName"`
	Status        string `json:"status"`
}

func List(c *fiber.Ctx) error {
	var students []model.Student
	query := db.DB.Order("created_at desc")

	if campusID := c.Query("campusId"); campusID != "" {
		query = query.Where("campus_id = ?", campusID)
	}
	if schoolName := c.Query("schoolName"); schoolName != "" {
		query = query.Where("school_name = ?", schoolName)
	}
	if className := c.Query("className"); className != "" {
		query = query.Where("class_name = ?", className)
	}
	if guardianPhone := c.Query("guardianPhone"); guardianPhone != "" {
		query = query.Where("guardian_phone = ?", guardianPhone)
	}
	if status := c.Query("status"); status != "" {
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
	campusIDs := make([]string, 0, len(students))
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
	for _, item := range students {
		campusIDs = append(campusIDs, item.CampusID)
	}

	campusNameMap := make(map[string]string)
	if len(campusIDs) > 0 {
		var campuses []campusModel.Campus
		if err := db.DB.Where("id IN ?", campusIDs).Find(&campuses).Error; err == nil {
			for _, campus := range campuses {
				campusNameMap[campus.Id.String()] = campus.Name
			}
		}
	}

	items := make([]fiber.Map, 0, len(students))
	for _, item := range students {
		plan, ok := serviceMap[item.Id.String()]
		serviceDate := fiber.Map{}
		if ok {
			serviceDate = fiber.Map{
				"paymentStatus":    plan.PaymentStatus,
				"paidAt":           plan.PaidAt,
				"serviceEndDate":   plan.ServiceEndDate,
				"serviceStartDate": plan.ServiceStartDate,
			}
		}

		items = append(items, fiber.Map{
			"campusId":       item.CampusID,
			"campusName":     campusNameMap[item.CampusID],
			"className":      item.ClassName,
			"grade":          item.Grade,
			"guardianName":   item.GuardianName,
			"guardianPhone":  item.GuardianPhone,
			"id":             item.Id,
			"name":           item.Name,
			"schoolName":     item.SchoolName,
			"serviceSummary": serviceDate,
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

	if req.Name == "" || req.CampusID == "" {
		return response.Error(c, "学生姓名和校区不能为空")
	}

	student := model.Student{
		CampusID:      req.CampusID,
		ClassName:     req.ClassName,
		Grade:         req.Grade,
		GuardianName:  req.GuardianName,
		GuardianPhone: req.GuardianPhone,
		Name:          req.Name,
		SchoolName:    req.SchoolName,
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

	var student model.Student
	if err := db.DB.First(&student, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "学生不存在")
	}

	student.CampusID = req.CampusID
	student.ClassName = req.ClassName
	student.Grade = req.Grade
	student.GuardianName = req.GuardianName
	student.GuardianPhone = req.GuardianPhone
	student.Name = req.Name
	student.SchoolName = req.SchoolName
	student.Status = defaultStudentStatus(req.Status)

	if err := db.DB.Save(&student).Error; err != nil {
		return response.Error(c, "更新学生失败")
	}

	return response.Success(c, student)
}

func defaultStudentStatus(status string) string {
	if status == "" {
		return "active"
	}

	return status
}
