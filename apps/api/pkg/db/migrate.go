package db

import (
	campusModel "github.com/ydfk/edu-nexa/apps/api/internal/model/campus"
	homeworkrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	mealrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/mealrecord"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	userModel "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
)

func autoMigrate() error {
	return DB.AutoMigrate(
		&userModel.User{},
		&campusModel.Campus{},
		&studentModel.Student{},
		&mealrecordModel.Record{},
		&homeworkrecordModel.Record{},
	)
}
