package auth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	jwtware "github.com/gofiber/jwt/v3"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"gorm.io/gorm"
)

type responseEnvelope struct {
	Flag bool            `json:"flag"`
	Code int             `json:"code"`
	Data json.RawMessage `json:"data"`
	Msg  string          `json:"msg"`
}

type tokenResponse struct {
	LoginType string       `json:"loginType"`
	Token     string       `json:"token"`
	User      userResponse `json:"user"`
}

type userResponse struct {
	DisplayName string   `json:"displayName"`
	Phone       string   `json:"phone"`
	Roles       []string `json:"roles"`
}

func setupTestApp(t *testing.T) *fiber.App {
	t.Helper()

	prevConfig := config.Current
	config.Current.Jwt.Secret = "test-secret"
	config.Current.Jwt.Expiration = 3600
	config.Current.App.Env = "test"
	config.Current.App.Port = "0"
	config.Current.Database.Path = ""
	config.Current.Wechat.DevPhone = "13900000000"
	config.Current.Wechat.AppID = ""
	config.Current.Wechat.AppSecret = ""
	config.IsProduction = false

	prevDB := db.DB
	gormDB, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := gormDB.AutoMigrate(&model.User{}); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}
	closeSQLDB(t, gormDB)
	db.DB = gormDB

	t.Cleanup(func() {
		config.Current = prevConfig
		db.DB = prevDB
	})

	app := fiber.New()
	RegisterUnProtectedRoutes(app)

	api := app.Group("/api")
	api.Use(jwtware.New(jwtware.Config{
		SigningKey: []byte(config.Current.Jwt.Secret),
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"code":    fiber.StatusUnauthorized,
				"message": "认证失败，请先登录",
			})
		},
	}))
	RegisterRoutes(api)

	return app
}

func closeSQLDB(t *testing.T, gormDB *gorm.DB) {
	t.Helper()
	sqlDB, err := gormDB.DB()
	if err != nil {
		t.Fatalf("get sql db: %v", err)
	}
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})
}

func doJSONRequest(
	t *testing.T,
	app *fiber.App,
	method string,
	path string,
	body interface{},
	headers map[string]string,
) *http.Response {
	t.Helper()

	var payload []byte
	if body != nil {
		var err error
		payload, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
	}

	var reader *bytes.Reader
	if payload != nil {
		reader = bytes.NewReader(payload)
	} else {
		reader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, path, reader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request error: %v", err)
	}
	return resp
}

func decodeEnvelope(t *testing.T, resp *http.Response) responseEnvelope {
	t.Helper()
	defer resp.Body.Close()

	var envelope responseEnvelope
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	return envelope
}

func TestAuthFlowRegisterLoginProfile(t *testing.T) {
	app := setupTestApp(t)

	registerResp := doJSONRequest(t, app, http.MethodPost, "/api/auth/register", fiber.Map{
		"displayName": "李老师",
		"password":    "pass123",
		"phone":       "13800000001",
		"roles":       []string{"admin", "teacher"},
	}, nil)
	if registerResp.StatusCode != http.StatusOK {
		t.Fatalf("register status: %d", registerResp.StatusCode)
	}

	registerEnvelope := decodeEnvelope(t, registerResp)
	if !registerEnvelope.Flag {
		t.Fatalf("register failed: %s", registerEnvelope.Msg)
	}

	var registeredUser userResponse
	if err := json.Unmarshal(registerEnvelope.Data, &registeredUser); err != nil {
		t.Fatalf("decode user: %v", err)
	}
	if registeredUser.Phone != "13800000001" {
		t.Fatalf("unexpected phone: %s", registeredUser.Phone)
	}
	if len(registeredUser.Roles) != 2 {
		t.Fatalf("unexpected roles: %v", registeredUser.Roles)
	}

	loginResp := doJSONRequest(t, app, http.MethodPost, "/api/auth/login", fiber.Map{
		"password": "pass123",
		"phone":    "13800000001",
	}, nil)
	if loginResp.StatusCode != http.StatusOK {
		t.Fatalf("login status: %d", loginResp.StatusCode)
	}

	loginEnvelope := decodeEnvelope(t, loginResp)
	if !loginEnvelope.Flag {
		t.Fatalf("login failed: %s", loginEnvelope.Msg)
	}

	var token tokenResponse
	if err := json.Unmarshal(loginEnvelope.Data, &token); err != nil {
		t.Fatalf("decode token: %v", err)
	}
	if token.Token == "" {
		t.Fatalf("empty token")
	}
	if token.LoginType != "admin_password" {
		t.Fatalf("unexpected login type: %s", token.LoginType)
	}
	if token.User.Phone != "13800000001" {
		t.Fatalf("unexpected login user phone: %s", token.User.Phone)
	}

	profileResp := doJSONRequest(t, app, http.MethodGet, "/api/auth/profile", nil, map[string]string{
		"Authorization": "Bearer " + token.Token,
	})
	if profileResp.StatusCode != http.StatusOK {
		t.Fatalf("profile status: %d", profileResp.StatusCode)
	}

	profileEnvelope := decodeEnvelope(t, profileResp)
	if !profileEnvelope.Flag {
		t.Fatalf("profile failed: %s", profileEnvelope.Msg)
	}

	var profileUser userResponse
	if err := json.Unmarshal(profileEnvelope.Data, &profileUser); err != nil {
		t.Fatalf("decode profile user: %v", err)
	}
	if profileUser.Phone != "13800000001" {
		t.Fatalf("unexpected profile phone: %s", profileUser.Phone)
	}
}

func TestProfileRequiresAuth(t *testing.T) {
	app := setupTestApp(t)

	resp := doJSONRequest(t, app, http.MethodGet, "/api/auth/profile", nil, nil)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected unauthorized, got %d", resp.StatusCode)
	}
}

func TestWeappPhoneLoginCreatesGuardianSession(t *testing.T) {
	app := setupTestApp(t)

	resp := doJSONRequest(t, app, http.MethodPost, "/api/auth/weapp/phone-login", fiber.Map{
		"phoneCode": "phone-code",
		"roleHint":  "guardian",
		"wxCode":    "wx-code",
	}, nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("weapp login status: %d", resp.StatusCode)
	}

	envelope := decodeEnvelope(t, resp)
	if !envelope.Flag {
		t.Fatalf("weapp login failed: %s", envelope.Msg)
	}

	var payload tokenResponse
	if err := json.Unmarshal(envelope.Data, &payload); err != nil {
		t.Fatalf("decode weapp login payload: %v", err)
	}
	if payload.LoginType != "weapp_phone" {
		t.Fatalf("unexpected login type: %s", payload.LoginType)
	}
	if payload.Token == "" {
		t.Fatalf("empty token")
	}
	if payload.User.Phone != "13900000000" {
		t.Fatalf("unexpected user phone: %s", payload.User.Phone)
	}
	if len(payload.User.Roles) != 1 || payload.User.Roles[0] != "guardian" {
		t.Fatalf("unexpected roles: %v", payload.User.Roles)
	}
}

func TestWeappPhoneLoginFailsWithoutWechatConfig(t *testing.T) {
	app := setupTestApp(t)
	config.Current.Wechat.DevPhone = ""

	resp := doJSONRequest(t, app, http.MethodPost, "/api/auth/weapp/phone-login", fiber.Map{
		"phoneCode": "phone-code",
		"wxCode":    "wx-code",
	}, nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("weapp login status: %d", resp.StatusCode)
	}

	envelope := decodeEnvelope(t, resp)
	if envelope.Flag {
		t.Fatalf("expected failure")
	}
	if envelope.Msg != "未配置微信手机号换取参数" {
		t.Fatalf("unexpected message: %s", envelope.Msg)
	}
}
