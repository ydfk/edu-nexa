package db

import (
	campusModel "github.com/ydfk/edu-nexa/apps/api/internal/model/campus"
	guardianbindingModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianbinding"
	homeconfigModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeconfig"
	homeworkassignmentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	homeworkrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	mealrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/mealrecord"
	runtimeconfigModel "github.com/ydfk/edu-nexa/apps/api/internal/model/runtimeconfig"
	servicedayModel "github.com/ydfk/edu-nexa/apps/api/internal/model/serviceday"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	studentserviceModel "github.com/ydfk/edu-nexa/apps/api/internal/model/studentservice"
	teacherprofileModel "github.com/ydfk/edu-nexa/apps/api/internal/model/teacherprofile"
	userModel "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
)

func autoMigrate() error {
	return DB.AutoMigrate(
		&userModel.User{},
		&campusModel.Campus{},
		&homeconfigModel.Config{},
		&runtimeconfigModel.Config{},
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
