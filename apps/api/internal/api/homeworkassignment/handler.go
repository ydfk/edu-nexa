package homeworkassignment

import (
	"errors"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	classgroupModel "github.com/ydfk/edu-nexa/apps/api/internal/model/classgroup"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	schoolModel "github.com/ydfk/edu-nexa/apps/api/internal/model/school"
	"github.com/ydfk/edu-nexa/apps/api/internal/service"
	"github.com/ydfk/edu-nexa/apps/api/internal/service/contentsafety"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
)

type assignmentPayload struct {
	CampusID    string `json:"campusId"`
	ClassID     string `json:"classId"`
	ClassName   string `json:"className"`
	Subject     string `json:"subject"`
	Content     string `json:"content"`
	Attachments string `json:"attachments"`
	Remark      string `json:"remark"`
	SchoolID    string `json:"schoolId"`
	SchoolName  string `json:"schoolName"`
	GradeName   string `json:"gradeName"`
	ServiceDate string `json:"serviceDate"`
	TeacherID   string `json:"teacherId"`
	TeacherName string `json:"teacherName"`
}

func List(c *fiber.Ctx) error {
	var assignments []model.Assignment
	query := db.DB.Order("service_date desc, created_at desc")

	if schoolName := strings.TrimSpace(c.Query("schoolName")); schoolName != "" {
		query = query.Where("school_name = ?", schoolName)
	}
	if className := strings.TrimSpace(c.Query("className")); className != "" {
		query = query.Where("class_name = ?", className)
	}
	if classID := strings.TrimSpace(c.Query("classId")); classID != "" {
		query = query.Where("class_id = ?", classID)
	}
	if serviceDate := strings.TrimSpace(c.Query("serviceDate")); serviceDate != "" {
		query = query.Where("service_date = ?", serviceDate)
	}
	if dateFrom := strings.TrimSpace(c.Query("dateFrom")); dateFrom != "" {
		query = query.Where("service_date >= ?", dateFrom)
	}
	if dateTo := strings.TrimSpace(c.Query("dateTo")); dateTo != "" {
		query = query.Where("service_date <= ?", dateTo)
	}
	if subject := strings.TrimSpace(c.Query("subject")); subject != "" {
		query = query.Where("subject = ?", subject)
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

	serviceDate := strings.TrimSpace(req.ServiceDate)
	if err := validateAssignmentPayload(req, serviceDate); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := contentsafety.CheckText(req.Content + "\n" + req.Remark); err != nil {
		return response.Error(c, err.Error())
	}
	classInfo, err := resolveAssignmentClass(req)
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := ensureAssignmentDestinationAvailable(classInfo, ""); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := ensureAssignmentUnique(serviceDate, strings.TrimSpace(req.Subject), classInfo, ""); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}

	assignment := model.Assignment{
		CampusID:    strings.TrimSpace(req.CampusID),
		ClassID:     classInfo.ClassID,
		ClassName:   classInfo.ClassName,
		Subject:     strings.TrimSpace(req.Subject),
		Content:     strings.TrimSpace(req.Content),
		Attachments: strings.TrimSpace(req.Attachments),
		Remark:      strings.TrimSpace(req.Remark),
		SchoolID:    classInfo.SchoolID,
		SchoolName:  classInfo.SchoolName,
		GradeName:   classInfo.GradeName,
		ServiceDate: serviceDate,
		TeacherID:   strings.TrimSpace(req.TeacherID),
		TeacherName: strings.TrimSpace(req.TeacherName),
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
	serviceDate := strings.TrimSpace(req.ServiceDate)
	if err := validateAssignmentPayload(req, serviceDate); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	classInfo, err := resolveAssignmentClass(req)
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := ensureAssignmentDestinationAvailable(classInfo, assignment.ClassID); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := ensureAssignmentUnique(serviceDate, strings.TrimSpace(req.Subject), classInfo, assignment.Id.String()); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	assignment.CampusID = strings.TrimSpace(req.CampusID)
	assignment.ClassID = classInfo.ClassID
	assignment.ClassName = classInfo.ClassName
	assignment.Subject = strings.TrimSpace(req.Subject)
	assignment.Content = strings.TrimSpace(req.Content)
	assignment.Attachments = strings.TrimSpace(req.Attachments)
	assignment.Remark = strings.TrimSpace(req.Remark)
	assignment.SchoolID = classInfo.SchoolID
	assignment.SchoolName = classInfo.SchoolName
	assignment.GradeName = classInfo.GradeName
	assignment.ServiceDate = serviceDate
	assignment.TeacherID = strings.TrimSpace(req.TeacherID)
	assignment.TeacherName = strings.TrimSpace(req.TeacherName)

	if err := db.DB.Save(&assignment).Error; err != nil {
		return response.Error(c, "更新每日作业失败")
	}

	return response.Success(c, assignment)
}

func Delete(c *fiber.Ctx) error {
	var assignment model.Assignment
	if err := db.DB.First(&assignment, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "每日作业不存在")
	}

	if err := db.DB.Delete(&assignment).Error; err != nil {
		return response.Error(c, "删除每日作业失败")
	}

	return response.Success(c, fiber.Map{"id": assignment.Id})
}

type assignmentClassInfo struct {
	ClassID    string
	ClassName  string
	GradeName  string
	SchoolID   string
	SchoolName string
	Status     string
}

func validateAssignmentPayload(req assignmentPayload, serviceDate string) error {
	if serviceDate == "" {
		return errors.New("日期不能为空")
	}
	if strings.TrimSpace(req.Subject) == "" {
		return errors.New("科目不能为空")
	}
	if strings.TrimSpace(req.Content) == "" {
		return errors.New("作业内容不能为空")
	}
	if strings.TrimSpace(req.ClassID) == "" &&
		((strings.TrimSpace(req.SchoolID) == "" && strings.TrimSpace(req.SchoolName) == "") ||
			strings.TrimSpace(req.ClassName) == "") {
		return errors.New("学校、年级、班级不能为空")
	}

	return nil
}

func resolveAssignmentClass(req assignmentPayload) (assignmentClassInfo, error) {
	classID := strings.TrimSpace(req.ClassID)
	schoolID := strings.TrimSpace(req.SchoolID)
	schoolName := strings.TrimSpace(req.SchoolName)
	gradeName := strings.TrimSpace(req.GradeName)
	className := strings.TrimSpace(req.ClassName)
	if classID == "" && ((schoolID == "" && schoolName == "") || className == "") {
		return assignmentClassInfo{}, errors.New("请选择学校、年级和班级")
	}

	var classItem classgroupModel.Class
	query := db.DB.Model(&classgroupModel.Class{})
	if classID != "" {
		if err := query.First(&classItem, "id = ?", classID).Error; err != nil {
			return assignmentClassInfo{}, errors.New("班级不存在")
		}
	} else {
		var classItems []classgroupModel.Class
		if schoolID != "" {
			query = query.Where("school_id = ?", schoolID)
		} else {
			query = query.Where("school_name = ?", schoolName)
		}
		query = query.Where("name = ?", className)
		if gradeName != "" {
			query = query.Where("grade_name = ?", gradeName)
		}
		if err := query.Find(&classItems).Error; err != nil {
			return assignmentClassInfo{}, errors.New("班级不存在")
		}
		if len(classItems) == 0 {
			return assignmentClassInfo{}, errors.New("班级不存在")
		}
		if len(classItems) > 1 {
			return assignmentClassInfo{}, errors.New("班级信息不明确，请重新选择学校、年级和班级")
		}
		classItem = classItems[0]
	}

	return assignmentClassInfo{
		ClassID:    classItem.Id.String(),
		ClassName:  classItem.Name,
		GradeName:  classItem.GradeName,
		SchoolID:   classItem.SchoolID,
		SchoolName: classItem.SchoolName,
		Status:     classItem.Status,
	}, nil
}

func ensureAssignmentDestinationAvailable(classInfo assignmentClassInfo, currentClassID string) error {
	if strings.TrimSpace(currentClassID) != classInfo.ClassID {
		if !service.IsActiveStatus(classInfo.Status) {
			return errors.New("班级已禁用")
		}

		var school schoolModel.School
		if err := db.DB.Select("id", "status").First(&school, "id = ?", classInfo.SchoolID).Error; err != nil {
			return errors.New("学校不存在")
		}
		if !service.IsActiveStatus(school.Status) {
			return errors.New("学校已禁用")
		}
	}

	return nil
}

func ensureAssignmentUnique(serviceDate string, subject string, classInfo assignmentClassInfo, excludeID string) error {
	if classInfo.ClassID == "" {
		return errors.New("班级不存在")
	}
	subject = strings.TrimSpace(subject)

	var items []model.Assignment
	if err := db.DB.Where("service_date = ?", serviceDate).Find(&items).Error; err != nil {
		return errors.New("校验每日作业失败")
	}

	for _, item := range items {
		if excludeID != "" && item.Id.String() == excludeID {
			continue
		}
		itemSubject := strings.TrimSpace(item.Subject)
		if item.ClassID != "" && item.ClassID == classInfo.ClassID && itemSubject == subject {
			return errors.New("同一天同一个学校班级同一科目只能有一份作业")
		}
		if item.ClassID == "" &&
			item.SchoolName == classInfo.SchoolName &&
			item.ClassName == classInfo.ClassName &&
			itemSubject == subject &&
			(item.GradeName == "" || classInfo.GradeName == "" || item.GradeName == classInfo.GradeName) {
			return errors.New("同一天同一个学校班级同一科目只能有一份作业")
		}
	}
	return nil
}
