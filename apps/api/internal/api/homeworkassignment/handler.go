package homeworkassignment

import (
	"encoding/json"
	"errors"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	classgroupModel "github.com/ydfk/edu-nexa/apps/api/internal/model/classgroup"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	schoolModel "github.com/ydfk/edu-nexa/apps/api/internal/model/school"
	attachmentservice "github.com/ydfk/edu-nexa/apps/api/internal/service/homeworkattachment"
	"github.com/ydfk/edu-nexa/apps/api/internal/service"
	"github.com/ydfk/edu-nexa/apps/api/internal/service/contentsafety"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type assignmentItemPayload struct {
	Content string `json:"content"`
}

type assignmentPayload struct {
	CampusID    string `json:"campusId"`
	ClassID     string `json:"classId"`
	ClassName   string `json:"className"`
	Subject     string `json:"subject"`
	Content     string `json:"content"`
	Items       []assignmentItemPayload `json:"items"`
	Attachments json.RawMessage `json:"attachments"`
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
	database := db.FromFiber(c)
	query := database.
		Preload("Attachments", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sort asc, created_at asc")
		}).
		Preload("Items", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sort asc, created_at asc")
		}).
		Order("service_date desc, created_at desc")

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

	items := make([]fiber.Map, 0, len(assignments))
	for _, assignment := range assignments {
		items = append(items, buildAssignmentPayload(assignment))
	}

	return response.Success(c, items)
}

func Create(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var req assignmentPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	serviceDate := strings.TrimSpace(req.ServiceDate)
	itemContents := normalizeAssignmentItems(req.Items, req.Content)
	if err := validateAssignmentPayload(req, serviceDate, itemContents); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	attachments, err := normalizeAssignmentAttachments(req.Attachments)
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	content := joinAssignmentContent(itemContents)
	if err := contentsafety.CheckText(content + "\n" + req.Remark); err != nil {
		return response.Error(c, err.Error())
	}
	classInfo, err := resolveAssignmentClass(database, req)
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := ensureAssignmentDestinationAvailableWithDB(database, classInfo, ""); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := ensureAssignmentUniqueWithDB(database, serviceDate, strings.TrimSpace(req.Subject), classInfo, ""); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}

	assignment := model.Assignment{
		CampusID:    strings.TrimSpace(req.CampusID),
		ClassID:     classInfo.ClassID,
		ClassName:   classInfo.ClassName,
		Subject:     strings.TrimSpace(req.Subject),
		Content:     content,
		Remark:      strings.TrimSpace(req.Remark),
		SchoolID:    classInfo.SchoolID,
		SchoolName:  classInfo.SchoolName,
		GradeName:   classInfo.GradeName,
		ServiceDate: serviceDate,
		TeacherID:   strings.TrimSpace(req.TeacherID),
		TeacherName: strings.TrimSpace(req.TeacherName),
	}

	if err := database.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&assignment).Error; err != nil {
			return err
		}
		builtAttachments, err := buildAssignmentAttachments(assignment.Id.String(), attachments)
		if err != nil {
			return err
		}
		if err := replaceAssignmentAttachments(tx, assignment.Id.String(), builtAttachments); err != nil {
			return err
		}
		if err := replaceAssignmentItems(tx, assignment.Id.String(), itemContents); err != nil {
			return err
		}
		assignment.Attachments = builtAttachments
		assignment.Items = buildAssignmentItems(assignment.Id.String(), itemContents)
		return nil
	}); err != nil {
		return response.Error(c, "创建每日作业失败")
	}

	return response.Success(c, buildAssignmentPayload(assignment))
}

func Update(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var req assignmentPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var assignment model.Assignment
	if err := database.First(&assignment, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "每日作业不存在")
	}
	serviceDate := strings.TrimSpace(req.ServiceDate)
	itemContents := normalizeAssignmentItems(req.Items, req.Content)
	if err := validateAssignmentPayload(req, serviceDate, itemContents); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	attachments, err := normalizeAssignmentAttachments(req.Attachments)
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	content := joinAssignmentContent(itemContents)
	if err := contentsafety.CheckText(content + "\n" + req.Remark); err != nil {
		return response.Error(c, err.Error())
	}
	classInfo, err := resolveAssignmentClass(database, req)
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := ensureAssignmentDestinationAvailableWithDB(database, classInfo, assignment.ClassID); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	if err := ensureAssignmentUniqueWithDB(database, serviceDate, strings.TrimSpace(req.Subject), classInfo, assignment.Id.String()); err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}
	assignment.CampusID = strings.TrimSpace(req.CampusID)
	assignment.ClassID = classInfo.ClassID
	assignment.ClassName = classInfo.ClassName
	assignment.Subject = strings.TrimSpace(req.Subject)
	assignment.Content = content
	assignment.Remark = strings.TrimSpace(req.Remark)
	assignment.SchoolID = classInfo.SchoolID
	assignment.SchoolName = classInfo.SchoolName
	assignment.GradeName = classInfo.GradeName
	assignment.ServiceDate = serviceDate
	assignment.TeacherID = strings.TrimSpace(req.TeacherID)
	assignment.TeacherName = strings.TrimSpace(req.TeacherName)

	if err := database.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&assignment).Error; err != nil {
			return err
		}
		builtAttachments, err := buildAssignmentAttachments(assignment.Id.String(), attachments)
		if err != nil {
			return err
		}
		if err := replaceAssignmentAttachments(tx, assignment.Id.String(), builtAttachments); err != nil {
			return err
		}
		if err := replaceAssignmentItems(tx, assignment.Id.String(), itemContents); err != nil {
			return err
		}
		assignment.Attachments = builtAttachments
		assignment.Items = buildAssignmentItems(assignment.Id.String(), itemContents)
		return nil
	}); err != nil {
		return response.Error(c, "更新每日作业失败")
	}

	return response.Success(c, buildAssignmentPayload(assignment))
}

func Delete(c *fiber.Ctx) error {
	database := db.FromFiber(c)
	var assignment model.Assignment
	if err := database.First(&assignment, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "每日作业不存在")
	}

	if err := database.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("assignment_id = ?", assignment.Id.String()).Delete(&model.Attachment{}).Error; err != nil {
			return err
		}
		if err := tx.Where("assignment_id = ?", assignment.Id.String()).Delete(&model.Item{}).Error; err != nil {
			return err
		}
		return tx.Delete(&assignment).Error
	}); err != nil {
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

func validateAssignmentPayload(req assignmentPayload, serviceDate string, itemContents []string) error {
	if serviceDate == "" {
		return errors.New("日期不能为空")
	}
	if strings.TrimSpace(req.Subject) == "" {
		return errors.New("科目不能为空")
	}
	if len(itemContents) == 0 {
		return errors.New("作业内容不能为空")
	}
	if strings.TrimSpace(req.ClassID) == "" &&
		((strings.TrimSpace(req.SchoolID) == "" && strings.TrimSpace(req.SchoolName) == "") ||
			strings.TrimSpace(req.ClassName) == "") {
		return errors.New("学校、年级、班级不能为空")
	}

	return nil
}

func resolveAssignmentClass(database *gorm.DB, req assignmentPayload) (assignmentClassInfo, error) {
	classID := strings.TrimSpace(req.ClassID)
	schoolID := strings.TrimSpace(req.SchoolID)
	schoolName := strings.TrimSpace(req.SchoolName)
	gradeName := strings.TrimSpace(req.GradeName)
	className := strings.TrimSpace(req.ClassName)
	if classID == "" && ((schoolID == "" && schoolName == "") || className == "") {
		return assignmentClassInfo{}, errors.New("请选择学校、年级和班级")
	}

	var classItem classgroupModel.Class
	query := database.Model(&classgroupModel.Class{})
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

func ensureAssignmentDestinationAvailable(database *gorm.DB, classInfo assignmentClassInfo, currentClassID string) error {
	return ensureAssignmentDestinationAvailableWithDB(database, classInfo, currentClassID)
}

func ensureAssignmentDestinationAvailableWithDB(database *gorm.DB, classInfo assignmentClassInfo, currentClassID string) error {
	if strings.TrimSpace(currentClassID) != classInfo.ClassID {
		if !service.IsActiveStatus(classInfo.Status) {
			return errors.New("班级已禁用")
		}

		var school schoolModel.School
		if err := database.Select("id", "status").First(&school, "id = ?", classInfo.SchoolID).Error; err != nil {
			return errors.New("学校不存在")
		}
		if !service.IsActiveStatus(school.Status) {
			return errors.New("学校已禁用")
		}
	}

	return nil
}

func ensureAssignmentUnique(serviceDate string, subject string, classInfo assignmentClassInfo, excludeID string) error {
	return ensureAssignmentUniqueWithDB(db.DB, serviceDate, subject, classInfo, excludeID)
}

func ensureAssignmentUniqueWithDB(database *gorm.DB, serviceDate string, subject string, classInfo assignmentClassInfo, excludeID string) error {
	if classInfo.ClassID == "" {
		return errors.New("班级不存在")
	}
	subject = strings.TrimSpace(subject)

	var items []model.Assignment
	if err := database.Where("service_date = ?", serviceDate).Find(&items).Error; err != nil {
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

func normalizeAssignmentItems(items []assignmentItemPayload, fallbackContent string) []string {
	results := make([]string, 0, len(items))
	for _, item := range items {
		content := strings.TrimSpace(item.Content)
		if content == "" {
			continue
		}
		results = append(results, content)
	}
	if len(results) > 0 {
		return results
	}

	lines := strings.Split(fallbackContent, "\n")
	results = make([]string, 0, len(lines))
	for _, line := range lines {
		content := strings.TrimSpace(line)
		if content == "" {
			continue
		}
		results = append(results, content)
	}
	return results
}

func joinAssignmentContent(items []string) string {
	return strings.Join(items, "\n")
}

func buildAssignmentItems(assignmentID string, itemContents []string) []model.Item {
	items := make([]model.Item, 0, len(itemContents))
	for index, itemContent := range itemContents {
		items = append(items, model.Item{
			AssignmentID: assignmentID,
			Sort:         index + 1,
			Content:      itemContent,
		})
	}
	return items
}

func normalizeAssignmentAttachments(raw json.RawMessage) ([]attachmentservice.Payload, error) {
	return attachmentservice.ParseRequest(raw)
}

func buildAssignmentAttachments(assignmentID string, payloads []attachmentservice.Payload) ([]model.Attachment, error) {
	if len(payloads) == 0 {
		return nil, nil
	}

	return attachmentservice.BuildModels(assignmentID, payloads)
}

func replaceAssignmentAttachments(tx *gorm.DB, assignmentID string, attachments []model.Attachment) error {
	if err := tx.Where("assignment_id = ?", assignmentID).Delete(&model.Attachment{}).Error; err != nil {
		return err
	}
	if len(attachments) == 0 {
		return nil
	}

	return tx.Create(&attachments).Error
}

func replaceAssignmentItems(tx *gorm.DB, assignmentID string, itemContents []string) error {
	if err := tx.Where("assignment_id = ?", assignmentID).Delete(&model.Item{}).Error; err != nil {
		return err
	}
	items := buildAssignmentItems(assignmentID, itemContents)
	if len(items) == 0 {
		return nil
	}
	return tx.Create(&items).Error
}

func buildAssignmentPayload(assignment model.Assignment) fiber.Map {
	items := assignment.Items
	if len(items) == 0 {
		items = buildAssignmentItems(assignment.Id.String(), normalizeAssignmentItems(nil, assignment.Content))
	}

	payloadItems := make([]fiber.Map, 0, len(items))
	for _, item := range items {
		payloadItems = append(payloadItems, fiber.Map{
			"id":           item.Id,
			"assignmentId": item.AssignmentID,
			"sort":         item.Sort,
			"content":      item.Content,
		})
	}

	payloadAttachments := make([]fiber.Map, 0, len(assignment.Attachments))
	for _, attachment := range attachmentservice.BuildResponses(assignment.Attachments) {
		payloadAttachments = append(payloadAttachments, fiber.Map{
			"bucket":    attachment.Bucket,
			"extension": attachment.Extension,
			"name":      attachment.Name,
			"objectKey": attachment.ObjectKey,
			"size":      attachment.Size,
		})
	}

	return fiber.Map{
		"id":          assignment.Id,
		"campusId":    assignment.CampusID,
		"classId":     assignment.ClassID,
		"className":   assignment.ClassName,
		"subject":     assignment.Subject,
		"content":     assignment.Content,
		"items":       payloadItems,
		"attachments": payloadAttachments,
		"remark":      assignment.Remark,
		"schoolId":    assignment.SchoolID,
		"schoolName":  assignment.SchoolName,
		"gradeName":   assignment.GradeName,
		"serviceDate": assignment.ServiceDate,
		"teacherId":   assignment.TeacherID,
		"teacherName": assignment.TeacherName,
		"createdAt":   assignment.CreatedAt,
		"updatedAt":   assignment.UpdatedAt,
	}
}
