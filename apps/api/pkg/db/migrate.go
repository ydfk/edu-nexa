package db

import (
	"fmt"

	classgroupModel "github.com/ydfk/edu-nexa/apps/api/internal/model/classgroup"
	gradelevelModel "github.com/ydfk/edu-nexa/apps/api/internal/model/gradelevel"
	guardianbindingModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianbinding"
	guardianprofileModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianprofile"
	homeconfigModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeconfig"
	homeworkassignmentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	homeworkrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	mealrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/mealrecord"
	runtimeconfigModel "github.com/ydfk/edu-nexa/apps/api/internal/model/runtimeconfig"
	schoolModel "github.com/ydfk/edu-nexa/apps/api/internal/model/school"
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
		&servicedayModel.Day{},
		&homeworkassignmentModel.Assignment{},
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

	return migrateLegacyRecords()
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
				"INSERT INTO %s (id, created_at, updated_at, scene, system_name_prefix, image_security_enable, image_security_strict, text_security_enable, text_security_strict, upload_provider, homework_subjects, deleted_at) "+
					"SELECT id, created_at, updated_at, scene, COALESCE(system_name_prefix, ''), image_security_enable, image_security_strict, text_security_enable, text_security_strict, upload_provider, COALESCE(homework_subjects, ''), deleted_at "+
					"FROM configs WHERE scene = 'app-runtime'",
				runtimeTable,
			),
		).Error; err != nil {
			return err
		}
	}

	return nil
}
