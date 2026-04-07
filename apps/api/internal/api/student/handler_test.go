package student

import "testing"

func TestValidateStudentPayloadRequiresGender(t *testing.T) {
	req := studentPayload{
		ClassID:       "class-1",
		ClassName:     "一班",
		Grade:         "一年级",
		GradeID:       "grade-1",
		GuardianID:    "guardian-1",
		GuardianName:  "家长",
		GuardianPhone: "13800000000",
		Name:          "学生",
		SchoolID:      "school-1",
		SchoolName:    "学校",
		Status:        "active",
	}

	if err := validateStudentPayload(req); err == nil || err.Error() != "性别不能为空" {
		t.Fatalf("expected gender validation error, got %v", err)
	}
}

func TestValidateStudentPayloadAcceptsSupportedGender(t *testing.T) {
	req := studentPayload{
		ClassID:       "class-1",
		ClassName:     "一班",
		Gender:        "female",
		Grade:         "一年级",
		GradeID:       "grade-1",
		GuardianID:    "guardian-1",
		GuardianName:  "家长",
		GuardianPhone: "13800000000",
		Name:          "学生",
		SchoolID:      "school-1",
		SchoolName:    "学校",
		Status:        "active",
	}

	if err := validateStudentPayload(req); err != nil {
		t.Fatalf("expected payload to be valid, got %v", err)
	}
}
