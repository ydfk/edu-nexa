package classgroup

import (
	"errors"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	homeworkassignmentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	homeworkrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/classgroup"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type classPayload struct {
	GradeID    string `json:"gradeId"`
	GradeName  string `json:"gradeName"`
	Name       string `json:"name"`
	SchoolID   string `json:"schoolId"`
	SchoolName string `json:"schoolName"`
	Status     string `json:"status"`
}

func List(c *fiber.Ctx) error {
	var items []model.Class
	query := db.DB.Order("created_at desc")

	if keyword := strings.TrimSpace(c.Query("keyword")); keyword != "" {
		query = query.Where("name LIKE ? OR school_name LIKE ? OR grade_name LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if schoolID := strings.TrimSpace(c.Query("schoolId")); schoolID != "" {
		query = query.Where("school_id = ?", schoolID)
	}
	if gradeID := strings.TrimSpace(c.Query("gradeId")); gradeID != "" {
		query = query.Where("grade_id = ?", gradeID)
	}
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&items).Error; err != nil {
		return response.Error(c, "查询班级失败")
	}

	return response.Success(c, items)
}

func Create(c *fiber.Ctx) error {
	var req classPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}
	if err := validateClassPayload(req); err != nil {
		return response.Error(c, err.Error())
	}
	if err := ensureClassNameUnique(strings.TrimSpace(req.Name), strings.TrimSpace(req.GradeID), ""); err != nil {
		return response.Error(c, err.Error())
	}

	item := model.Class{
		GradeID:    strings.TrimSpace(req.GradeID),
		GradeName:  strings.TrimSpace(req.GradeName),
		Name:       strings.TrimSpace(req.Name),
		SchoolID:   strings.TrimSpace(req.SchoolID),
		SchoolName: strings.TrimSpace(req.SchoolName),
		Status:     defaultClassStatus(req.Status),
	}
	if err := db.DB.Create(&item).Error; err != nil {
		return response.Error(c, "创建班级失败")
	}

	return response.Success(c, item)
}

func Update(c *fiber.Ctx) error {
	var req classPayload
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, "参数不正确")
	}

	var item model.Class
	if err := db.DB.First(&item, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "班级不存在")
	}
	if err := validateClassPayload(req); err != nil {
		return response.Error(c, err.Error())
	}
	if err := ensureClassNameUnique(strings.TrimSpace(req.Name), strings.TrimSpace(req.GradeID), item.Id.String()); err != nil {
		return response.Error(c, err.Error())
	}

	item.GradeID = strings.TrimSpace(req.GradeID)
	item.GradeName = strings.TrimSpace(req.GradeName)
	item.Name = strings.TrimSpace(req.Name)
	item.SchoolID = strings.TrimSpace(req.SchoolID)
	item.SchoolName = strings.TrimSpace(req.SchoolName)
	item.Status = defaultClassStatus(req.Status)
	if err := db.DB.Save(&item).Error; err != nil {
		return response.Error(c, "更新班级失败")
	}

	return response.Success(c, item)
}

func Delete(c *fiber.Ctx) error {
	var item model.Class
	if err := db.DB.First(&item, "id = ?", c.Params("id")).Error; err != nil {
		return response.Error(c, "班级不存在")
	}
	if err := ensureClassDeletable(item); err != nil {
		return response.Error(c, err.Error())
	}

	if err := db.DB.Delete(&item).Error; err != nil {
		return response.Error(c, "删除班级失败")
	}

	return response.Success(c, fiber.Map{"id": item.Id})
}

func defaultClassStatus(status string) string {
	if strings.TrimSpace(status) == "" {
		return "active"
	}

	return strings.TrimSpace(status)
}

func validateClassPayload(req classPayload) error {
	if strings.TrimSpace(req.Name) == "" {
		return errors.New("班级名称不能为空")
	}
	if strings.TrimSpace(req.SchoolID) == "" || strings.TrimSpace(req.SchoolName) == "" {
		return errors.New("学校不能为空")
	}
	if strings.TrimSpace(req.GradeID) == "" || strings.TrimSpace(req.GradeName) == "" {
		return errors.New("年级不能为空")
	}

	return nil
}

func ensureClassNameUnique(name string, gradeID string, excludeID string) error {
	var item model.Class
	query := db.DB.Where("LOWER(name) = LOWER(?)", strings.TrimSpace(name))
	if strings.TrimSpace(gradeID) != "" {
		query = query.Where("grade_id = ?", strings.TrimSpace(gradeID))
	}
	if excludeID != "" {
		query = query.Where("id <> ?", excludeID)
	}

	if err := query.First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return errors.New("班级名称校验失败")
	}

	return errors.New("班级名称已存在")
}

func ensureClassDeletable(item model.Class) error {
	var count int64
	if err := db.DB.Model(&studentModel.Student{}).Where("class_id = ?", item.Id.String()).Count(&count).Error; err != nil {
		return errors.New("校验班级关联学生失败")
	}
	if count > 0 {
		return errors.New("班级下存在学生，不能删除")
	}

	if err := db.DB.Model(&homeworkassignmentModel.Assignment{}).
		Where("school_name = ? AND class_name = ?", item.SchoolName, item.Name).
		Count(&count).Error; err != nil {
		return errors.New("校验班级关联每日作业失败")
	}
	if count > 0 {
		return errors.New("班级已关联每日作业，不能删除")
	}

	if err := db.DB.Model(&homeworkrecordModel.Record{}).
		Where("school_name = ? AND class_name = ?", item.SchoolName, item.Name).
		Count(&count).Error; err != nil {
		return errors.New("校验班级关联作业记录失败")
	}
	if count > 0 {
		return errors.New("班级已关联作业记录，不能删除")
	}

	return nil
}
