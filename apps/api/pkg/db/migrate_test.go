package db

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/glebarez/sqlite"
	homeworkassignmentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	guardianprofileModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianprofile"
	teacherprofileModel "github.com/ydfk/edu-nexa/apps/api/internal/model/teacherprofile"
	"gorm.io/gorm"
)

func openTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	testDB, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}

	sqlDB, err := testDB.DB()
	if err != nil {
		t.Fatalf("get sql db: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})

	return testDB
}

const (
	testAssignmentID = "11111111-1111-1111-1111-111111111111"
	testAttachmentID = "22222222-2222-2222-2222-222222222222"
)

func createAssignmentTableForTest(t *testing.T) {
	t.Helper()

	if err := DB.AutoMigrate(&homeworkassignmentModel.Assignment{}); err != nil {
		t.Fatalf("create assignment table: %v", err)
	}
}

func TestAutoMigrateSeparatesProfileTables(t *testing.T) {
	prevDB := DB
	t.Cleanup(func() {
		DB = prevDB
	})

	DB = openTestDB(t)

	if err := DB.Exec(`
		CREATE TABLE profiles (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			user_id TEXT,
			name TEXT NOT NULL,
			phone TEXT NOT NULL,
			role_scope TEXT DEFAULT "teacher",
			status TEXT DEFAULT "active",
			description TEXT
		)
	`).Error; err != nil {
		t.Fatalf("create legacy profiles table: %v", err)
	}

	if err := DB.Exec(`
		INSERT INTO profiles (id, created_at, updated_at, user_id, name, phone, role_scope, status, description)
		VALUES ("teacher-1", "2026-04-02 10:00:00", "2026-04-02 10:00:00", "user-1", "李老师", "13800000001", "teacher", "active", "班主任")
	`).Error; err != nil {
		t.Fatalf("seed legacy profiles table: %v", err)
	}

	if err := autoMigrate(); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	if !DB.Migrator().HasTable(guardianprofileModel.Profile{}.TableName()) {
		t.Fatalf("expected guardian profile table to exist")
	}
	if !DB.Migrator().HasTable(teacherprofileModel.Profile{}.TableName()) {
		t.Fatalf("expected teacher profile table to exist")
	}
	if !DB.Migrator().HasColumn(guardianprofileModel.Profile{}, "relationship") {
		t.Fatalf("expected guardian profile relationship column to exist")
	}
	if !DB.Migrator().HasColumn(guardianprofileModel.Profile{}, "remark") {
		t.Fatalf("expected guardian profile remark column to exist")
	}

	var count int64
	if err := DB.Table(teacherprofileModel.Profile{}.TableName()).Count(&count).Error; err != nil {
		t.Fatalf("count teacher profiles: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 migrated teacher profile, got %d", count)
	}
}

func TestAutoMigrateCreatesHomeworkAssignmentItemsFromLegacyContent(t *testing.T) {
	prevDB := DB
	t.Cleanup(func() {
		DB = prevDB
	})

	DB = openTestDB(t)

	createAssignmentTableForTest(t)

	if err := DB.Exec(`
		INSERT INTO assignments (
			id, created_at, updated_at, campus_id, service_date, school_name, class_name, subject, content, remark, teacher_name
		) VALUES (
			?, '2026-04-02 10:00:00', '2026-04-02 10:00:00', '', '2026-04-02', '沣东九小', '一班', '数学', '口算十题
订正错题', '', ''
		)
	`, testAssignmentID).Error; err != nil {
		t.Fatalf("seed assignments table: %v", err)
	}

	if err := autoMigrate(); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	if !DB.Migrator().HasTable(homeworkassignmentModel.Item{}.TableName()) {
		t.Fatalf("expected homework assignment items table to exist")
	}

	var items []homeworkassignmentModel.Item
	if err := DB.Order("sort asc").Find(&items, "assignment_id = ?", testAssignmentID).Error; err != nil {
		t.Fatalf("query homework assignment items: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 migrated homework items, got %d", len(items))
	}
	if items[0].Content != "口算十题" || items[1].Content != "订正错题" {
		t.Fatalf("unexpected migrated content: %#v", items)
	}
}

func TestAutoMigrateMovesHomeworkAssignmentAttachmentsToTable(t *testing.T) {
	prevDB := DB
	t.Cleanup(func() {
		DB = prevDB
	})

	DB = openTestDB(t)

	createAssignmentTableForTest(t)
	if !DB.Migrator().HasColumn("assignments", "attachments") {
		if err := DB.Exec("ALTER TABLE assignments ADD COLUMN attachments TEXT").Error; err != nil {
			t.Fatalf("add legacy attachments column: %v", err)
		}
	}

	legacyAttachments, err := json.Marshal([]map[string]string{
		{
			"url": "https://yiyixiaowu.cn-beijing.oss.aliyuncs.com/edunexa/homework/2026/04/demo-1.jpg",
		},
		{
			"url": "https://yiyixiaowu.cn-beijing.oss.aliyuncs.com/edunexa/homework/2026/04/demo-2.pdf",
		},
	})
	if err != nil {
		t.Fatalf("marshal legacy attachments: %v", err)
	}

	if err := DB.Exec(`
		INSERT INTO assignments (
			id, created_at, updated_at, campus_id, service_date, school_name, class_name, subject, content, attachments, remark, teacher_name
		) VALUES (
			?, '2026-04-02 10:00:00', '2026-04-02 10:00:00', '', '2026-04-02', '沣东九小', '一班', '数学', '口算十题', ?, '', ''
		)
	`, testAssignmentID, string(legacyAttachments)).Error; err != nil {
		t.Fatalf("seed assignments table: %v", err)
	}

	if err := autoMigrate(); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	if !DB.Migrator().HasTable(homeworkassignmentModel.Attachment{}.TableName()) {
		t.Fatalf("expected homework assignment attachments table to exist")
	}
	if DB.Migrator().HasColumn("assignments", "attachments") {
		t.Fatalf("expected legacy attachments column to be removed")
	}

	var attachments []homeworkassignmentModel.Attachment
	if err := DB.Order("sort asc").Find(&attachments, "assignment_id = ?", testAssignmentID).Error; err != nil {
		t.Fatalf("query homework assignment attachments: %v", err)
	}
	if len(attachments) != 2 {
		t.Fatalf("expected 2 migrated homework attachments, got %d", len(attachments))
	}
	if attachments[0].Bucket != "yiyixiaowu" {
		t.Fatalf("unexpected bucket: %#v", attachments[0])
	}
	if attachments[0].ObjectKey != "edunexa/homework/2026/04/demo-1.jpg" {
		t.Fatalf("unexpected object key: %#v", attachments[0])
	}
	if attachments[0].Name != "demo-1.jpg" {
		t.Fatalf("unexpected name: %#v", attachments[0])
	}
	if attachments[0].Extension != ".jpg" {
		t.Fatalf("unexpected extension: %#v", attachments[0])
	}
	if attachments[0].Size != 0 {
		t.Fatalf("unexpected size: %#v", attachments[0])
	}
}

func TestAutoMigrateKeepsLegacyAttachmentColumnWhenUnsupportedDataExists(t *testing.T) {
	prevDB := DB
	t.Cleanup(func() {
		DB = prevDB
	})

	DB = openTestDB(t)

	createAssignmentTableForTest(t)
	if !DB.Migrator().HasColumn("assignments", "attachments") {
		if err := DB.Exec("ALTER TABLE assignments ADD COLUMN attachments TEXT").Error; err != nil {
			t.Fatalf("add legacy attachments column: %v", err)
		}
	}

	legacyAttachments, err := json.Marshal([]map[string]string{
		{
			"url": "/uploads/local/homework/2026/04/demo-1.jpg",
		},
		{
			"url": "https://yiyixiaowu.cn-beijing.oss.aliyuncs.com/edunexa/homework/2026/04/demo-2.pdf",
		},
	})
	if err != nil {
		t.Fatalf("marshal legacy attachments: %v", err)
	}

	if err := DB.Exec(`
		INSERT INTO assignments (
			id, created_at, updated_at, campus_id, service_date, school_name, class_name, subject, content, attachments, remark, teacher_name
		) VALUES (
			?, '2026-04-02 10:00:00', '2026-04-02 10:00:00', '', '2026-04-02', '沣东九小', '一班', '数学', '口算十题', ?, '', ''
		)
	`, testAssignmentID, string(legacyAttachments)).Error; err != nil {
		t.Fatalf("seed assignments table: %v", err)
	}

	if err := autoMigrate(); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	if !DB.Migrator().HasColumn("assignments", "attachments") {
		t.Fatalf("expected legacy attachments column to be kept when unsupported data exists")
	}

	var attachments []homeworkassignmentModel.Attachment
	if err := DB.Order("sort asc").Find(&attachments, "assignment_id = ?", testAssignmentID).Error; err != nil {
		t.Fatalf("query homework assignment attachments: %v", err)
	}
	if len(attachments) != 1 {
		t.Fatalf("expected 1 migrated homework attachment, got %d", len(attachments))
	}
	if attachments[0].ObjectKey != "edunexa/homework/2026/04/demo-2.pdf" {
		t.Fatalf("unexpected object key: %#v", attachments[0])
	}
	if attachments[0].Name != "demo-2.pdf" {
		t.Fatalf("unexpected name: %#v", attachments[0])
	}
	if attachments[0].Extension != ".pdf" {
		t.Fatalf("unexpected extension: %#v", attachments[0])
	}
}

func TestAutoMigrateBackfillsHomeworkAttachmentMetadata(t *testing.T) {
	prevDB := DB
	t.Cleanup(func() {
		DB = prevDB
	})

	DB = openTestDB(t)

	if err := DB.AutoMigrate(&homeworkassignmentModel.Attachment{}); err != nil {
		t.Fatalf("create attachments table: %v", err)
	}

	if err := DB.Exec(`
		INSERT INTO homework_assignment_attachments (
			id, created_at, updated_at, assignment_id, sort, bucket, name, extension, object_key, size
		) VALUES (
			?, '2026-04-02 10:00:00', '2026-04-02 10:00:00', ?, 1, 'yiyixiaowu', '', '', 'edunexa/homework/2026/04/demo-3.png', -1
		)
	`, testAttachmentID, testAssignmentID).Error; err != nil {
		t.Fatalf("seed attachments table: %v", err)
	}

	if err := autoMigrate(); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	var attachment homeworkassignmentModel.Attachment
	if err := DB.First(&attachment, "id = ?", testAttachmentID).Error; err != nil {
		t.Fatalf("query attachment: %v", err)
	}
	if attachment.Name != "demo-3.png" {
		t.Fatalf("unexpected name: %#v", attachment)
	}
	if attachment.Extension != ".png" {
		t.Fatalf("unexpected extension: %#v", attachment)
	}
	if attachment.Size != 0 {
		t.Fatalf("unexpected size: %#v", attachment)
	}
}
