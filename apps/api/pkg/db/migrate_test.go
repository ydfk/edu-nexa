package db

import (
	"testing"

	"github.com/glebarez/sqlite"
	guardianprofileModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianprofile"
	teacherprofileModel "github.com/ydfk/edu-nexa/apps/api/internal/model/teacherprofile"
	"gorm.io/gorm"
)

func TestAutoMigrateSeparatesProfileTables(t *testing.T) {
	prevDB := DB
	t.Cleanup(func() {
		DB = prevDB
	})

	testDB, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	DB = testDB

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
