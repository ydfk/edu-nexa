package upload

import (
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"

	"github.com/gofiber/fiber/v2"
)

func PreviewFile(c *fiber.Ctx) error {
	setPreviewCORSHeaders(c)
	if strings.EqualFold(c.Query("format"), "base64") {
		return previewFileAsBase64(c)
	}

	if sourceURL := strings.TrimSpace(c.Query("url")); sourceURL != "" {
		return proxyPreviewFile(c, sourceURL)
	}

	return previewLocalFile(c, c.Params("*"))
}

func PreviewFileOptions(c *fiber.Ctx) error {
	setPreviewCORSHeaders(c)
	return c.SendStatus(fiber.StatusNoContent)
}

type previewPayload struct {
	content     []byte
	contentType string
	fileName    string
}

func previewFileAsBase64(c *fiber.Ctx) error {
	payload, err := loadPreviewPayload(c)
	if err != nil {
		return err
	}

	return response.Success(c, fiber.Map{
		"contentBase64": base64.StdEncoding.EncodeToString(payload.content),
		"contentType":   payload.contentType,
		"fileName":      payload.fileName,
	})
}

func loadPreviewPayload(c *fiber.Ctx) (previewPayload, error) {
	if sourceURL := strings.TrimSpace(c.Query("url")); sourceURL != "" {
		return loadProxyPreviewPayload(sourceURL)
	}

	return loadLocalPreviewPayload(c.Params("*"))
}

func previewLocalFile(c *fiber.Ctx, rawPath string) error {
	payload, err := loadLocalPreviewPayload(rawPath)
	if err != nil {
		return err
	}

	return sendPreviewPayload(c, payload)
}

func proxyPreviewFile(c *fiber.Ctx, sourceURL string) error {
	payload, err := loadProxyPreviewPayload(sourceURL)
	if err != nil {
		return err
	}

	return sendPreviewPayload(c, payload)
}

func loadLocalPreviewPayload(rawPath string) (previewPayload, error) {
	relativePath := strings.TrimPrefix(path.Clean("/"+rawPath), "/")
	if relativePath == "" || relativePath == "." || strings.HasPrefix(relativePath, "..") {
		return previewPayload{}, fiber.ErrNotFound
	}

	rootDir := strings.TrimSpace(config.Current.Storage.Local.Dir)
	if rootDir == "" {
		rootDir = "data/uploads"
	}

	rootAbs, err := filepath.Abs(rootDir)
	if err != nil {
		return previewPayload{}, fiber.ErrInternalServerError
	}

	targetPath := filepath.Join(rootAbs, filepath.FromSlash(relativePath))
	targetAbs, err := filepath.Abs(targetPath)
	if err != nil {
		return previewPayload{}, fiber.ErrInternalServerError
	}

	relativeToRoot, err := filepath.Rel(rootAbs, targetAbs)
	if err != nil || relativeToRoot == ".." || strings.HasPrefix(relativeToRoot, ".."+string(filepath.Separator)) {
		return previewPayload{}, fiber.ErrNotFound
	}

	info, err := os.Stat(targetAbs)
	if err != nil || info.IsDir() {
		return previewPayload{}, fiber.ErrNotFound
	}

	content, err := os.ReadFile(targetAbs)
	if err != nil {
		return previewPayload{}, fiber.ErrInternalServerError
	}

	return previewPayload{
		content:     content,
		contentType: detectPreviewContentType(filepath.Ext(targetAbs), "", content),
		fileName:    filepath.Base(targetAbs),
	}, nil
}

func loadProxyPreviewPayload(sourceURL string) (previewPayload, error) {
	parsed, err := url.Parse(sourceURL)
	if err != nil {
		return previewPayload{}, fiber.ErrNotFound
	}

	if parsed.Scheme == "" && strings.HasPrefix(parsed.Path, "/uploads/") {
		return loadLocalPreviewPayload(strings.TrimPrefix(parsed.Path, "/uploads/"))
	}

	normalizedURL, err := normalizePreviewSourceURL(parsed)
	if err != nil || !isAllowedPreviewURL(normalizedURL) {
		return previewPayload{}, fiber.ErrNotFound
	}

	request, err := http.NewRequest(http.MethodGet, normalizedURL, nil)
	if err != nil {
		return previewPayload{}, fiber.ErrInternalServerError
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return previewPayload{}, fiber.ErrBadGateway
	}
	defer response.Body.Close()

	if response.StatusCode >= http.StatusBadRequest {
		return previewPayload{}, fiber.ErrNotFound
	}

	content, err := io.ReadAll(response.Body)
	if err != nil {
		return previewPayload{}, fiber.ErrBadGateway
	}

	return previewPayload{
		content:     content,
		contentType: detectPreviewContentType(path.Ext(parsed.Path), response.Header.Get(fiber.HeaderContentType), content),
		fileName:    path.Base(parsed.Path),
	}, nil
}

func sendPreviewPayload(c *fiber.Ctx, payload previewPayload) error {
	if payload.contentType != "" {
		c.Set(fiber.HeaderContentType, payload.contentType)
	}
	c.Set(fiber.HeaderContentDisposition, fmt.Sprintf("inline; filename*=UTF-8''%s", url.PathEscape(payload.fileName)))
	c.Set(fiber.HeaderContentLength, fmt.Sprintf("%d", len(payload.content)))
	c.Status(fiber.StatusOK)
	c.Context().Response.SetBodyRaw(payload.content)
	return nil
}

func detectPreviewContentType(ext string, headerContentType string, content []byte) string {
	if trimmed := strings.TrimSpace(headerContentType); trimmed != "" {
		return trimmed
	}

	if mimeType := mime.TypeByExtension(strings.ToLower(ext)); mimeType != "" {
		return mimeType
	}

	if len(content) == 0 {
		return ""
	}

	return http.DetectContentType(content)
}

func setPreviewCORSHeaders(c *fiber.Ctx) {
	origin := strings.TrimSpace(c.Get(fiber.HeaderOrigin))
	if origin == "" {
		origin = "*"
	}

	c.Set("Access-Control-Allow-Origin", origin)
	c.Set("Access-Control-Allow-Methods", "GET,OPTIONS")
	c.Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Range, Authorization")
	c.Set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Type, Content-Disposition, Accept-Ranges")
	if origin != "*" {
		c.Set(fiber.HeaderVary, fiber.HeaderOrigin)
	}
}

func normalizePreviewSourceURL(parsed *url.URL) (string, error) {
	if parsed.Scheme != "" && parsed.Host != "" {
		return parsed.String(), nil
	}

	if !strings.HasPrefix(parsed.Path, "/uploads/") {
		return "", fmt.Errorf("invalid source url")
	}

	baseURL := strings.TrimSpace(config.Current.Storage.Local.BaseURL)
	if baseURL == "" {
		baseURL = "http://127.0.0.1:" + config.Current.App.Port
	}

	base, err := url.Parse(baseURL)
	if err != nil {
		return "", err
	}

	return base.ResolveReference(&url.URL{
		Path:     parsed.Path,
		RawQuery: parsed.RawQuery,
	}).String(), nil
}

func isAllowedPreviewURL(rawURL string) bool {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Host == "" {
		return false
	}

	for _, prefix := range allowedPreviewURLPrefixes() {
		if strings.HasPrefix(rawURL, prefix) {
			return true
		}
	}

	return false
}

func allowedPreviewURLPrefixes() []string {
	prefixes := []string{}
	appendPrefix := func(value string) {
		trimmed := strings.TrimRight(strings.TrimSpace(value), "/")
		if trimmed == "" {
			return
		}
		for _, current := range prefixes {
			if current == trimmed {
				return
			}
		}
		prefixes = append(prefixes, trimmed)
	}

	localBaseURL := strings.TrimSpace(config.Current.Storage.Local.BaseURL)
	if localBaseURL == "" {
		localBaseURL = "http://127.0.0.1:" + config.Current.App.Port
	}
	for _, baseURL := range expandLocalPreviewBaseURLs(localBaseURL) {
		appendPrefix(baseURL + config.Current.Storage.Local.PublicPath)
	}
	appendPrefix(config.Current.Storage.AliyunOSS.BaseURL)
	appendPrefix(config.Current.Storage.UpYun.BaseURL)

	if endpoint := strings.TrimSpace(config.Current.Storage.AliyunOSS.Endpoint); endpoint != "" && config.Current.Storage.AliyunOSS.Bucket != "" {
		if !strings.Contains(endpoint, "://") {
			endpoint = "https://" + endpoint
		}
		if parsed, err := url.Parse(endpoint); err == nil && parsed.Host != "" {
			appendPrefix(parsed.Scheme + "://" + config.Current.Storage.AliyunOSS.Bucket + "." + parsed.Host)
		}
	}

	return prefixes
}

func expandLocalPreviewBaseURLs(baseURL string) []string {
	values := []string{}
	appendValue := func(value string) {
		trimmed := strings.TrimRight(strings.TrimSpace(value), "/")
		if trimmed == "" {
			return
		}
		for _, current := range values {
			if current == trimmed {
				return
			}
		}
		values = append(values, trimmed)
	}

	appendValue(baseURL)

	parsed, err := url.Parse(baseURL)
	if err != nil || parsed.Host == "" {
		return values
	}

	switch parsed.Hostname() {
	case "127.0.0.1":
		appendValue(parsed.Scheme + "://localhost" + portSuffix(parsed))
	case "localhost":
		appendValue(parsed.Scheme + "://127.0.0.1" + portSuffix(parsed))
	}

	return values
}

func portSuffix(parsed *url.URL) string {
	if parsed.Port() == "" {
		return ""
	}

	return ":" + parsed.Port()
}
