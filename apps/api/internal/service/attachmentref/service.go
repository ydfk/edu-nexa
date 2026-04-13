package attachmentref

import (
	"encoding/json"
	"fmt"
	"path"
	"strings"

	uploadservice "github.com/ydfk/edu-nexa/apps/api/internal/service/upload"
)

type Payload struct {
	Bucket    string `json:"bucket"`
	Extension string `json:"extension"`
	Name      string `json:"name"`
	ObjectKey string `json:"objectKey"`
	Size      int64  `json:"size"`
	URL       string `json:"url"`
}

type Response struct {
	Bucket    string `json:"bucket"`
	Extension string `json:"extension"`
	Name      string `json:"name"`
	ObjectKey string `json:"objectKey"`
	Size      int64  `json:"size"`
}

func ParseRequest(raw json.RawMessage) ([]Payload, error) {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" {
		return nil, nil
	}

	if strings.HasPrefix(trimmed, "\"") {
		var legacyValue string
		if err := json.Unmarshal(raw, &legacyValue); err != nil {
			return nil, fmt.Errorf("附件格式不正确")
		}
		return parseLegacyString(legacyValue)
	}

	return parseJSONArray(raw)
}

func ParseStored(raw string) []Response {
	payloads, err := parseLegacyString(raw)
	if err != nil || len(payloads) == 0 {
		return []Response{}
	}

	items, err := BuildResponses(payloads)
	if err != nil {
		return []Response{}
	}

	return items
}

func SerializePayloads(payloads []Payload) (string, error) {
	items, err := BuildResponses(payloads)
	if err != nil {
		return "", err
	}
	if len(items) == 0 {
		return "", nil
	}

	content, err := json.Marshal(items)
	if err != nil {
		return "", fmt.Errorf("附件格式不正确")
	}
	return string(content), nil
}

func BuildResponses(payloads []Payload) ([]Response, error) {
	items := make([]Response, 0, len(payloads))
	for _, payload := range payloads {
		ref, err := uploadservice.NormalizeStoredObjectRef(payload.Bucket, payload.ObjectKey, payload.URL)
		if err != nil {
			return nil, err
		}

		items = append(items, Response{
			Bucket:    ref.Bucket,
			Extension: normalizeAttachmentExtension(payload.Extension, payload.Name, ref.ObjectKey),
			Name:      normalizeAttachmentName(payload.Name, ref.ObjectKey),
			ObjectKey: ref.ObjectKey,
			Size:      normalizeAttachmentSize(payload.Size),
		})
	}

	return items, nil
}

func parseJSONArray(raw []byte) ([]Payload, error) {
	var values []json.RawMessage
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, fmt.Errorf("附件格式不正确")
	}

	results := make([]Payload, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(string(value))
		if trimmed == "" || trimmed == "null" {
			continue
		}

		if strings.HasPrefix(trimmed, "\"") {
			var url string
			if err := json.Unmarshal(value, &url); err != nil {
				return nil, fmt.Errorf("附件格式不正确")
			}
			if strings.TrimSpace(url) == "" {
				continue
			}
			results = append(results, Payload{URL: url})
			continue
		}

		var payload Payload
		if err := json.Unmarshal(value, &payload); err != nil {
			return nil, fmt.Errorf("附件格式不正确")
		}
		if strings.TrimSpace(payload.ObjectKey) == "" && strings.TrimSpace(payload.URL) == "" {
			continue
		}

		results = append(results, payload)
	}

	return results, nil
}

func parseLegacyString(raw string) ([]Payload, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}

	if strings.HasPrefix(trimmed, "[") {
		return parseJSONArray([]byte(trimmed))
	}

	parts := strings.Split(trimmed, ",")
	results := make([]Payload, 0, len(parts))
	for _, part := range parts {
		url := strings.TrimSpace(part)
		if url == "" {
			continue
		}
		results = append(results, Payload{URL: url})
	}
	return results, nil
}

func normalizeAttachmentName(rawName string, objectKey string) string {
	name := strings.TrimSpace(rawName)
	if name != "" {
		return name
	}
	return path.Base(strings.TrimSpace(objectKey))
}

func normalizeAttachmentExtension(rawExtension string, rawName string, objectKey string) string {
	extension := strings.ToLower(strings.TrimSpace(rawExtension))
	if extension != "" {
		if !strings.HasPrefix(extension, ".") {
			return "." + extension
		}
		return extension
	}

	name := normalizeAttachmentName(rawName, objectKey)
	if ext := strings.ToLower(path.Ext(name)); ext != "" {
		return ext
	}

	return strings.ToLower(path.Ext(strings.TrimSpace(objectKey)))
}

func normalizeAttachmentSize(size int64) int64 {
	if size < 0 {
		return 0
	}
	return size
}
