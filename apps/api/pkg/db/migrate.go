package db

import (
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
	return DB.AutoMigrate(
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
	)
}
