package upload

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	"github.com/ydfk/edu-nexa/apps/api/internal/service"
	uploadservice "github.com/ydfk/edu-nexa/apps/api/internal/service/upload"
)

func CreateAliyunSTSUpload(c *fiber.Ctx) error {
	fileSize, err := strconv.ParseInt(strings.TrimSpace(c.Query("fileSize")), 10, 64)
	if err != nil {
		fileSize = 0
	}

	currentUser, err := service.CurrentUser(c)
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusUnauthorized)
	}

	result, err := uploadservice.CreateAliyunSTSUpload(
		c.Query("fileName"),
		c.Query("contentType"),
		fileSize,
		c.Query("purpose"),
		currentUser.Id.String(),
	)
	if err != nil {
		return response.Error(c, err.Error())
	}

	return response.Success(c, result)
}
