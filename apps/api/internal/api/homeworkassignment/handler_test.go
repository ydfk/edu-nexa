package homeworkassignment

import (
	"testing"

	"github.com/glebarez/sqlite"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"gorm.io/gorm"
)

func TestEnsureAssignmentUniqueRejectsSameClassDateSubject(t *testing.T) {
	prevDB := db.DB
	t.Cleanup(func() {
		db.DB = prevDB
	})

	testDB, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	db.DB = testDB

	if err := db.DB.AutoMigrate(&model.Assignment{}); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	existing := model.Assignment{
		ServiceDate: "2026-04-02",
		SchoolID:    "school-1",
		SchoolName:  "沣东九小",
		GradeName:   "四年级",
		ClassID:     "class-1",
		ClassName:   "一班",
		Subject:     "数学",
		Content:     "口算十题",
	}
	if err := db.DB.Create(&existing).Error; err != nil {
		t.Fatalf("seed assignment: %v", err)
	}

	err = ensureAssignmentUnique("2026-04-02", "数学", assignmentClassInfo{
		ClassID:    "class-1",
		ClassName:  "一班",
		GradeName:  "四年级",
		SchoolID:   "school-1",
		SchoolName: "沣东九小",
	}, "")
	if err == nil {
		t.Fatalf("expected duplicate assignment error")
	}
	if err.Error() != "同一天同一个学校班级同一科目只能有一份作业" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestNormalizeAssignmentItemsFallsBackToContent(t *testing.T) {
	items := normalizeAssignmentItems(nil, "口算十题\n\n订正错题")
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0] != "口算十题" || items[1] != "订正错题" {
		t.Fatalf("unexpected items: %#v", items)
	}
}
