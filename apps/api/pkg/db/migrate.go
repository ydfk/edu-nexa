package db

import (
	"fmt"
	"path"
	"strings"

	classgroupModel "github.com/ydfk/edu-nexa/apps/api/internal/model/classgroup"
	gradelevelModel "github.com/ydfk/edu-nexa/apps/api/internal/model/gradelevel"
	guardianbindingModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianbinding"
	guardianprofileModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianprofile"
	homeconfigModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeconfig"
	homeworkassignmentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	homeworkrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	mealrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/mealrecord"
	paymentrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/paymentrecord"
	runtimeconfigModel "github.com/ydfk/edu-nexa/apps/api/internal/model/runtimeconfig"
	schoolModel "github.com/ydfk/edu-nexa/apps/api/internal/model/school"
	attachmentservice "github.com/ydfk/edu-nexa/apps/api/internal/service/homeworkattachment"
	servicedayModel "github.com/ydfk/edu-nexa/apps/api/internal/model/serviceday"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	studentserviceModel "github.com/ydfk/edu-nexa/apps/api/internal/model/studentservice"
	teacherprofileModel "github.com/ydfk/edu-nexa/apps/api/internal/model/teacherprofile"
	userModel "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
)

func autoMigrate() error {
	if err := DB.AutoMigrate(
		&userModel.User{},
		&homeconfigModel.Config{},
		&runtimeconfigModel.Config{},
		&schoolModel.School{},
		&gradelevelModel.Grade{},
		&classgroupModel.Class{},
		&guardianprofileModel.Profile{},
		&studentModel.Student{},
		&guardianbindingModel.Binding{},
		&teacherprofileModel.Profile{},
		&studentserviceModel.Plan{},
		&paymentrecordModel.Record{},
		&servicedayModel.Day{},
		&homeworkassignmentModel.Assignment{},
		&homeworkassignmentModel.Attachment{},
		&homeworkassignmentModel.Item{},
		&mealrecordModel.Record{},
		&homeworkrecordModel.Record{},
	); err != nil {
		return err
	}

	if err := migrateLegacyProfiles(); err != nil {
		return err
	}
	if err := migrateLegacyConfigs(); err != nil {
		return err
	}
	if err := migrateLegacyPaymentRecords(); err != nil {
		return err
	}
	if err := migrateLegacyHomeworkAssignmentItems(); err != nil {
		return err
	}
	if err := migrateLegacyHomeworkAssignmentAttachments(); err != nil {
		return err
	}
	if err := backfillHomeworkAttachmentMetadata(); err != nil {
		return err
	}
	if err := migrateLegacyRecords(); err != nil {
		return err
	}

	return backfillHomeworkRecordAssignments()
}

func migrateLegacyProfiles() error {
	migrator := DB.Migrator()
	if !migrator.HasTable("profiles") {
		return nil
	}
	if !migrator.HasColumn("profiles", "role_scope") || !migrator.HasColumn("profiles", "description") {
		return nil
	}

	teacherTable := teacherprofileModel.Profile{}.TableName()

	var count int64
	if err := DB.Table(teacherTable).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	return DB.Exec(
		fmt.Sprintf(
			"INSERT INTO %s (id, created_at, updated_at, user_id, name, phone, role_scope, status, description) "+
				"SELECT id, created_at, updated_at, user_id, name, phone, role_scope, status, description FROM profiles",
			teacherTable,
		),
	).Error
}

func migrateLegacyRecords() error {
	migrator := DB.Migrator()
	if !migrator.HasTable("records") {
		return nil
	}

	mealTable := mealrecordModel.Record{}.TableName()
	homeworkTable := homeworkrecordModel.Record{}.TableName()

	var mealCount int64
	if err := DB.Table(mealTable).Count(&mealCount).Error; err != nil {
		return err
	}
	if mealCount == 0 {
		if err := DB.Exec(
			fmt.Sprintf(
				"INSERT INTO %s (id, created_at, updated_at, campus_id, student_id, student_name, service_date, status, remark, image_urls, recorded_by_id, recorded_by, deleted_at) "+
					"SELECT id, created_at, updated_at, COALESCE(campus_id, ''), student_id, student_name, service_date, status, remark, image_urls, recorded_by_id, recorded_by, deleted_at "+
					"FROM records WHERE COALESCE(school_name, '') = '' AND COALESCE(class_name, '') = '' AND COALESCE(subject_summary, '') = ''",
				mealTable,
			),
		).Error; err != nil {
			return err
		}
	}

	var homeworkCount int64
	if err := DB.Table(homeworkTable).Count(&homeworkCount).Error; err != nil {
		return err
	}
	if homeworkCount == 0 {
		if err := DB.Exec(
			fmt.Sprintf(
				"INSERT INTO %s (id, created_at, updated_at, campus_id, student_id, student_name, school_name, class_name, service_date, status, subject_summary, remark, image_urls, recorded_by_id, recorded_by, deleted_at) "+
					"SELECT id, created_at, updated_at, COALESCE(campus_id, ''), student_id, student_name, school_name, class_name, service_date, status, subject_summary, remark, image_urls, recorded_by_id, recorded_by, deleted_at "+
					"FROM records WHERE COALESCE(school_name, '') <> '' OR COALESCE(class_name, '') <> '' OR COALESCE(subject_summary, '') <> ''",
				homeworkTable,
			),
		).Error; err != nil {
			return err
		}
	}

	return nil
}

func migrateLegacyConfigs() error {
	migrator := DB.Migrator()
	if !migrator.HasTable("configs") || !migrator.HasColumn("configs", "scene") {
		return nil
	}

	homeTable := homeconfigModel.Config{}.TableName()
	var homeCount int64
	if err := DB.Table(homeTable).Count(&homeCount).Error; err != nil {
		return err
	}
	if homeCount == 0 {
		if migrator.HasColumn("configs", "hero_title") &&
			migrator.HasColumn("configs", "hero_subtitle") &&
			migrator.HasColumn("configs", "announcement") &&
			migrator.HasColumn("configs", "banners_json") {
			if err := DB.Exec(
				fmt.Sprintf(
					"INSERT INTO %s (id, created_at, updated_at, scene, hero_title, hero_subtitle, announcement, banners_json, deleted_at) "+
						"SELECT id, created_at, updated_at, scene, hero_title, hero_subtitle, announcement, banners_json, deleted_at "+
						"FROM configs WHERE scene = 'weapp-home'",
					homeTable,
				),
			).Error; err != nil {
				return err
			}
		}
	}

	runtimeTable := runtimeconfigModel.Config{}.TableName()
	var runtimeCount int64
	if err := DB.Table(runtimeTable).Count(&runtimeCount).Error; err != nil {
		return err
	}
	if runtimeCount == 0 {
		if err := DB.Exec(
			fmt.Sprintf(
				"INSERT INTO %s (id, created_at, updated_at, scene, system_name_prefix, image_security_enable, image_security_strict, text_security_enable, text_security_strict, homework_subjects, payment_types, deleted_at) "+
					"SELECT id, created_at, updated_at, scene, COALESCE(system_name_prefix, ''), image_security_enable, image_security_strict, text_security_enable, text_security_strict, COALESCE(homework_subjects, ''), '', deleted_at "+
					"FROM configs WHERE scene = 'app-runtime'",
				runtimeTable,
			),
		).Error; err != nil {
			return err
		}
	}

	return nil
}

func migrateLegacyPaymentRecords() error {
	paymentTable := paymentrecordModel.Record{}.TableName()

	var paymentCount int64
	if err := DB.Table(paymentTable).Count(&paymentCount).Error; err != nil {
		return err
	}
	if paymentCount > 0 {
		return nil
	}

	var plans []studentserviceModel.Plan
	if err := DB.Find(&plans).Error; err != nil {
		return err
	}
	if len(plans) == 0 {
		return nil
	}

	for _, plan := range plans {
		if plan.PaymentAmount <= 0 && strings.TrimSpace(plan.PaidAt) == "" {
			continue
		}

		var student studentModel.Student
		if err := DB.First(&student, "id = ?", plan.StudentID).Error; err != nil {
			continue
		}

		item := paymentrecordModel.Record{
			BaseModel:       plan.BaseModel,
			StudentID:       student.Id.String(),
			StudentName:     student.Name,
			SchoolID:        student.SchoolID,
			SchoolName:      student.SchoolName,
			GradeID:         student.GradeID,
			GradeName:       student.Grade,
			ClassID:         student.ClassID,
			ClassName:       student.ClassName,
			GuardianID:      student.GuardianID,
			GuardianName:    student.GuardianName,
			GuardianPhone:   student.GuardianPhone,
			PaymentType:     "未分类",
			PaymentAmount:   plan.PaymentAmount,
			PeriodStartDate: plan.ServiceStartDate,
			PeriodEndDate:   plan.ServiceEndDate,
			PaidAt:          plan.PaidAt,
			Remark:          plan.Remark,
			Status:          "paid",
		}

		if err := DB.Create(&item).Error; err != nil {
			return err
		}
	}

	return nil
}

func migrateLegacyHomeworkAssignmentItems() error {
	migrator := DB.Migrator()
	if !migrator.HasTable(&homeworkassignmentModel.Assignment{}) || !migrator.HasTable(homeworkassignmentModel.Item{}.TableName()) {
		return nil
	}

	var assignments []homeworkassignmentModel.Assignment
	if err := DB.Unscoped().Find(&assignments).Error; err != nil {
		return err
	}

	for _, assignment := range assignments {
		var count int64
		if err := DB.Unscoped().
			Model(&homeworkassignmentModel.Item{}).
			Where("assignment_id = ?", assignment.Id.String()).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}

		lines := splitLegacyHomeworkContent(assignment.Content)
		if len(lines) == 0 {
			continue
		}

		items := buildHomeworkAssignmentItems(assignment.Id.String(), lines)
		if err := DB.Create(&items).Error; err != nil {
			return err
		}
	}

	return nil
}

func migrateLegacyHomeworkAssignmentAttachments() error {
	migrator := DB.Migrator()
	if !migrator.HasTable(&homeworkassignmentModel.Assignment{}) ||
		!migrator.HasTable(homeworkassignmentModel.Attachment{}.TableName()) ||
		!migrator.HasColumn("assignments", "attachments") {
		return nil
	}

	type legacyAssignmentAttachment struct {
		ID          string
		Attachments string
	}

	var assignments []legacyAssignmentAttachment
	if err := DB.Unscoped().
		Table("assignments").
		Select("id", "attachments").
		Where("COALESCE(attachments, '') <> ''").
		Scan(&assignments).Error; err != nil {
		return err
	}

	hasUnsupportedAttachments := false
	for _, assignment := range assignments {
		payloads, err := attachmentservice.ParseLegacyString(assignment.Attachments)
		if err != nil {
			return err
		}

		_, skippedCount, err := attachmentservice.BuildMigratedModels(assignment.ID, payloads)
		if err != nil {
			return err
		}
		if skippedCount > 0 {
			hasUnsupportedAttachments = true
		}

		var count int64
		if err := DB.Unscoped().
			Model(&homeworkassignmentModel.Attachment{}).
			Where("assignment_id = ?", assignment.ID).
			Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			continue
		}

		attachments, skippedCount, err := attachmentservice.BuildMigratedModels(assignment.ID, payloads)
		if err != nil {
			return err
		}
		if len(attachments) == 0 {
			continue
		}

		if err := DB.Create(&attachments).Error; err != nil {
			return err
		}
	}

	if hasUnsupportedAttachments {
		return nil
	}

	return migrator.DropColumn("assignments", "attachments")
}

func backfillHomeworkAttachmentMetadata() error {
	if !DB.Migrator().HasTable(homeworkassignmentModel.Attachment{}.TableName()) {
		return nil
	}

	var attachments []homeworkassignmentModel.Attachment
	if err := DB.Find(&attachments).Error; err != nil {
		return err
	}

	for _, attachment := range attachments {
		updates := map[string]interface{}{}
		name := strings.TrimSpace(attachment.Name)
		if name == "" {
			name = path.Base(strings.TrimSpace(attachment.ObjectKey))
		}
		extension := strings.TrimSpace(attachment.Extension)
		if extension == "" {
			extension = strings.ToLower(path.Ext(name))
			if extension == "" {
				extension = strings.ToLower(path.Ext(strings.TrimSpace(attachment.ObjectKey)))
			}
		}
		if strings.TrimSpace(attachment.Name) == "" {
			updates["name"] = name
		}
		if strings.TrimSpace(attachment.Extension) == "" {
			updates["extension"] = extension
		}
		if attachment.Size < 0 {
			updates["size"] = int64(0)
		}
		if len(updates) == 0 {
			continue
		}

		if err := DB.Model(&attachment).Updates(updates).Error; err != nil {
			return err
		}
	}

	return nil
}

func backfillHomeworkRecordAssignments() error {
	migrator := DB.Migrator()
	if !migrator.HasTable(homeworkrecordModel.Record{}.TableName()) || !migrator.HasTable(&homeworkassignmentModel.Assignment{}) {
		return nil
	}

	var records []homeworkrecordModel.Record
	if err := DB.Find(&records).Error; err != nil {
		return err
	}

	for _, record := range records {
		if strings.TrimSpace(record.Subject) != "" && strings.TrimSpace(record.AssignmentID) != "" {
			continue
		}

		var student studentModel.Student
		if err := DB.Select("id", "school_name", "class_id", "class_name", "grade").First(&student, "id = ?", record.StudentID).Error; err != nil {
			continue
		}

		assignment, ok := matchLegacyHomeworkAssignment(record, student)
		if !ok {
			continue
		}

		updates := map[string]interface{}{}
		if strings.TrimSpace(record.Subject) == "" {
			updates["subject"] = assignment.Subject
		}
		if strings.TrimSpace(record.AssignmentID) == "" {
			updates["assignment_id"] = assignment.Id.String()
		}
		if strings.TrimSpace(record.SubjectSummary) == "" {
			updates["subject_summary"] = assignment.Content
		}
		if len(updates) == 0 {
			continue
		}

		if err := DB.Model(&record).Updates(updates).Error; err != nil {
			return err
		}
	}

	return nil
}

func splitLegacyHomeworkContent(content string) []string {
	parts := strings.Split(content, "\n")
	lines := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		lines = append(lines, trimmed)
	}
	return lines
}

func buildHomeworkAssignmentItems(assignmentID string, lines []string) []homeworkassignmentModel.Item {
	items := make([]homeworkassignmentModel.Item, 0, len(lines))
	for index, line := range lines {
		items = append(items, homeworkassignmentModel.Item{
			AssignmentID: assignmentID,
			Sort:         index + 1,
			Content:      line,
		})
	}
	return items
}

func matchLegacyHomeworkAssignment(record homeworkrecordModel.Record, student studentModel.Student) (homeworkassignmentModel.Assignment, bool) {
	query := DB.Model(&homeworkassignmentModel.Assignment{}).
		Where("service_date = ?", record.ServiceDate)

	if student.ClassID != "" {
		query = query.Where("class_id = ?", student.ClassID)
	} else {
		query = query.Where("school_name = ? AND class_name = ?", student.SchoolName, student.ClassName)
	}

	var candidates []homeworkassignmentModel.Assignment
	if err := query.Find(&candidates).Error; err != nil || len(candidates) == 0 {
		return homeworkassignmentModel.Assignment{}, false
	}

	subjectSummary := strings.TrimSpace(record.SubjectSummary)
	subject := strings.TrimSpace(record.Subject)
	if subject != "" {
		for _, candidate := range candidates {
			if strings.TrimSpace(candidate.Subject) == subject {
				return candidate, true
			}
		}
	}
	if subjectSummary != "" {
		for _, candidate := range candidates {
			if strings.TrimSpace(candidate.Subject) == subjectSummary || strings.TrimSpace(candidate.Content) == subjectSummary {
				return candidate, true
			}
		}
	}
	if len(candidates) == 1 {
		return candidates[0], true
	}

	return homeworkassignmentModel.Assignment{}, false
}
