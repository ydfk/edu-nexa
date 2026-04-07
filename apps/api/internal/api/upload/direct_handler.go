package upload

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	"github.com/ydfk/edu-nexa/apps/api/internal/service/upload"
)

func CreateDirectUploadURL(c *fiber.Ctx) error {
	fileSize, err := strconv.ParseInt(strings.TrimSpace(c.Query("fileSize")), 10, 64)
	if err != nil {
		fileSize = 0
	}

	result, err := upload.CreateDirectUploadURL(
		c.Query("fileName"),
		c.Query("contentType"),
		fileSize,
		c.Query("purpose"),
	)
	if err != nil {
		return response.Error(c, err.Error())
	}

	return response.Success(c, result)
}

func CreateAccessURL(c *fiber.Ctx) error {
	result, err := upload.ResolveAccessURL(
		c.Query("url"),
		c.Query("disposition"),
		c.Query("fileName"),
	)
	if err != nil {
		return response.Error(c, err.Error())
	}

	return response.Success(c, result)
}
