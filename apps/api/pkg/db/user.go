/*
 * @Description: Copyright (c) ydfk. All rights reserved
 * @Author: ydfk
 * @Date: 2025-06-10 13:58:58
 * @LastEditors: ydfk
 * @LastEditTime: 2025-06-10 16:43:35
 */
package db

import (
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
	"gorm.io/gorm"
)

func GetUserById(id string) (model.User, error) {
	return GetUserByIdFrom(DB, id)
}

func GetUserByIdFrom(database *gorm.DB, id string) (model.User, error) {
	var user model.User
	result := database.First(&user, "id = ?", id)
	if result.Error != nil {
		return user, result.Error
	}

	return user, nil
}
