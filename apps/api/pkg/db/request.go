package db

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

const requestDBLocalKey = "request_db"

func ResolveDataDB(isDemo bool) *gorm.DB {
	if isDemo && DemoDB != nil {
		return DemoDB
	}

	return DB
}

func SetRequestDB(c *fiber.Ctx, database *gorm.DB) {
	if c == nil || database == nil {
		return
	}

	c.Locals(requestDBLocalKey, database)
}

func FromFiber(c *fiber.Ctx) *gorm.DB {
	if c != nil {
		if database, ok := c.Locals(requestDBLocalKey).(*gorm.DB); ok && database != nil {
			return database
		}
	}

	return DB
}
