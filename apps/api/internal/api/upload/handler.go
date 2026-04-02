package upload

import (
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	"github.com/ydfk/edu-nexa/apps/api/internal/service/upload"

	"github.com/gofiber/fiber/v2"
)

func UploadImage(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return response.Error(c, "请选择要上传的图片")
	}

	result, err := upload.UploadImage(fileHeader, c.FormValue("provider"), c.FormValue("purpose"))
	if err != nil {
		return response.Error(c, err.Error())
	}

	return response.Success(c, result)
}

func UploadFile(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return response.Error(c, "请选择要上传的文件")
	}

	result, err := upload.UploadFile(fileHeader, c.FormValue("provider"), c.FormValue("purpose"))
	if err != nil {
		return response.Error(c, err.Error())
	}

	return response.Success(c, result)
}
