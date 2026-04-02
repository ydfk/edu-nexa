package homeworkrecord

import (
	"testing"

	"github.com/glebarez/sqlite"
	assignmentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"gorm.io/gorm"
)

func TestEnsureHomeworkRecordUniqueRejectsSameStudentDateSubject(t *testing.T) {
	prevDB := db.DB
	t.Cleanup(func() {
		db.DB = prevDB
	})

	testDB, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	db.DB = testDB

	if err := db.DB.AutoMigrate(&model.Record{}); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	existing := model.Record{
		StudentID:      "student-1",
		StudentName:    "小明",
		ServiceDate:    "2026-04-02",
		Status:         "completed",
		Subject:        "数学",
		SubjectSummary: "口算十题",
	}
	if err := db.DB.Create(&existing).Error; err != nil {
		t.Fatalf("seed homework record: %v", err)
	}

	err = ensureHomeworkRecordUnique("student-1", "2026-04-02", "数学", "assignment-1", "")
	if err == nil {
		t.Fatalf("expected duplicate homework record error")
	}
	if err.Error() != "同一个学生同一天同一科目只能有一条作业记录" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestBuildHomeworkSubjectSummaryUsesAssignmentContent(t *testing.T) {
	summary := buildHomeworkSubjectSummary("", &assignmentModel.Assignment{
		Content: "口算十题\n订正错题",
	})
	if summary != "口算十题\n订正错题" {
		t.Fatalf("unexpected summary: %q", summary)
	}
}
