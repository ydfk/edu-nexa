package demoseed

import (
	"fmt"
	"strings"
	"time"

	classgroupModel "github.com/ydfk/edu-nexa/apps/api/internal/model/classgroup"
	gradelevelModel "github.com/ydfk/edu-nexa/apps/api/internal/model/gradelevel"
	guardianbindingModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianbinding"
	guardianprofileModel "github.com/ydfk/edu-nexa/apps/api/internal/model/guardianprofile"
	homeworkassignmentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	homeworkrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkrecord"
	mealrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/mealrecord"
	paymentrecordModel "github.com/ydfk/edu-nexa/apps/api/internal/model/paymentrecord"
	schoolModel "github.com/ydfk/edu-nexa/apps/api/internal/model/school"
	servicedayModel "github.com/ydfk/edu-nexa/apps/api/internal/model/serviceday"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	studentserviceModel "github.com/ydfk/edu-nexa/apps/api/internal/model/studentservice"
	teacherprofileModel "github.com/ydfk/edu-nexa/apps/api/internal/model/teacherprofile"
	userModel "github.com/ydfk/edu-nexa/apps/api/internal/model/user"
	runtimeconfigService "github.com/ydfk/edu-nexa/apps/api/internal/service/runtimeconfig"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type demoStudentSeed struct {
	Name          string
	Gender        string
	GradeName     string
	ClassName     string
	GuardianPhone string
}

func RebuildFromRuntimeSettings() (*runtimeconfigService.Snapshot, error) {
	snapshot, err := runtimeconfigService.GetAdminSnapshot()
	if err != nil {
		return nil, err
	}

	if err := db.ResetDemoDatabase(); err != nil {
		return nil, err
	}
	if db.DemoDB == nil {
		return nil, fmt.Errorf("demo 数据库不可用")
	}

	if err := db.DemoDB.Transaction(func(tx *gorm.DB) error {
		teacherUser, err := createDemoUser(tx, snapshot.DemoTeacherName, snapshot.DemoTeacherPhone, snapshot.DemoTeacherPassword, []string{"admin", "teacher"})
		if err != nil {
			return err
		}
		guardianUser, err := createDemoUser(tx, snapshot.DemoGuardianName, snapshot.DemoGuardianPhone, snapshot.DemoGuardianPassword, []string{"guardian"})
		if err != nil {
			return err
		}

		school, err := createDemoSchool(tx, "壹一小屋 学栖演示校")
		if err != nil {
			return err
		}
		grades, err := createDemoGrades(tx)
		if err != nil {
			return err
		}
		classes, err := createDemoClasses(tx, school, grades)
		if err != nil {
			return err
		}
		teacherProfile, err := createDemoTeacherProfile(tx, teacherUser)
		if err != nil {
			return err
		}
		guardians, err := createDemoGuardianProfiles(tx, guardianUser)
		if err != nil {
			return err
		}
		students, err := createDemoStudents(tx, school, grades, classes, guardians)
		if err != nil {
			return err
		}
		if err := createDemoGuardianBindings(tx, students, guardians); err != nil {
			return err
		}
		if err := createDemoServiceDays(tx); err != nil {
			return err
		}
		if err := createDemoServicePlans(tx, students); err != nil {
			return err
		}
		if err := createDemoPaymentRecords(tx, students); err != nil {
			return err
		}
		assignments, err := createDemoHomeworkAssignments(tx, school, classes, teacherProfile)
		if err != nil {
			return err
		}
		if err := createDemoHomeworkRecords(tx, students, assignments, teacherProfile); err != nil {
			return err
		}
		if err := createDemoMealRecords(tx, students, teacherProfile); err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return snapshot, nil
}

func createDemoUser(tx *gorm.DB, displayName string, phone string, password string, roles []string) (*userModel.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(strings.TrimSpace(password)), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &userModel.User{
		DisplayName: strings.TrimSpace(displayName),
		Phone:       strings.TrimSpace(phone),
		Password:    string(hash),
		Roles:       strings.Join(roles, ","),
		Status:      "active",
	}
	if err := tx.Create(user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

func createDemoSchool(tx *gorm.DB, name string) (*schoolModel.School, error) {
	item := &schoolModel.School{Name: name, Status: "active"}
	if err := tx.Create(item).Error; err != nil {
		return nil, err
	}
	return item, nil
}

func createDemoGrades(tx *gorm.DB) (map[string]gradelevelModel.Grade, error) {
	items := []gradelevelModel.Grade{
		{Name: "四年级", Sort: 4, Status: "active"},
		{Name: "五年级", Sort: 5, Status: "active"},
		{Name: "六年级", Sort: 6, Status: "active"},
	}
	if err := tx.Create(&items).Error; err != nil {
		return nil, err
	}

	result := make(map[string]gradelevelModel.Grade, len(items))
	for _, item := range items {
		result[item.Name] = item
	}
	return result, nil
}

func createDemoClasses(tx *gorm.DB, school *schoolModel.School, grades map[string]gradelevelModel.Grade) (map[string]classgroupModel.Class, error) {
	items := []classgroupModel.Class{
		{SchoolID: school.Id.String(), SchoolName: school.Name, GradeID: grades["四年级"].Id.String(), GradeName: "四年级", Name: "一班", Status: "active"},
		{SchoolID: school.Id.String(), SchoolName: school.Name, GradeID: grades["五年级"].Id.String(), GradeName: "五年级", Name: "二班", Status: "active"},
		{SchoolID: school.Id.String(), SchoolName: school.Name, GradeID: grades["六年级"].Id.String(), GradeName: "六年级", Name: "一班", Status: "active"},
	}
	if err := tx.Create(&items).Error; err != nil {
		return nil, err
	}

	result := make(map[string]classgroupModel.Class, len(items))
	for _, item := range items {
		result[fmt.Sprintf("%s-%s", item.GradeName, item.Name)] = item
	}
	return result, nil
}

func createDemoTeacherProfile(tx *gorm.DB, user *userModel.User) (*teacherprofileModel.Profile, error) {
	item := &teacherprofileModel.Profile{
		UserID:      user.Id.String(),
		Name:        user.DisplayName,
		Phone:       user.Phone,
		RoleScope:   "admin,teacher",
		Status:      "active",
		Description: "演示环境教师账号，可直接体验管理端和小程序教师能力",
	}
	if err := tx.Create(item).Error; err != nil {
		return nil, err
	}
	return item, nil
}

func createDemoGuardianProfiles(tx *gorm.DB, demoGuardianUser *userModel.User) (map[string]guardianprofileModel.Profile, error) {
	items := []guardianprofileModel.Profile{
		{
			Name:         demoGuardianUser.DisplayName,
			Phone:        demoGuardianUser.Phone,
			UserID:       demoGuardianUser.Id.String(),
			Relationship: "家长",
			Remark:       "主演示家长，可查看两个孩子的记录",
			Status:       "active",
		},
		{
			Name:         "演示家长二",
			Phone:        "18800000003",
			Relationship: "家长",
			Remark:       "辅助演示家长，用于丰富学校和班级数据",
			Status:       "active",
		},
	}
	if err := tx.Create(&items).Error; err != nil {
		return nil, err
	}

	result := make(map[string]guardianprofileModel.Profile, len(items))
	for _, item := range items {
		result[item.Phone] = item
	}
	return result, nil
}

func createDemoStudents(
	tx *gorm.DB,
	school *schoolModel.School,
	grades map[string]gradelevelModel.Grade,
	classes map[string]classgroupModel.Class,
	guardians map[string]guardianprofileModel.Profile,
) (map[string]studentModel.Student, error) {
	seeds := []demoStudentSeed{
		{Name: "林小满", Gender: "female", GradeName: "四年级", ClassName: "一班", GuardianPhone: "18800000002"},
		{Name: "林知远", Gender: "male", GradeName: "五年级", ClassName: "二班", GuardianPhone: "18800000002"},
		{Name: "周沐阳", Gender: "male", GradeName: "四年级", ClassName: "一班", GuardianPhone: "18800000003"},
		{Name: "许星禾", Gender: "female", GradeName: "五年级", ClassName: "二班", GuardianPhone: "18800000003"},
		{Name: "陈书言", Gender: "female", GradeName: "六年级", ClassName: "一班", GuardianPhone: "18800000003"},
	}

	items := make([]studentModel.Student, 0, len(seeds))
	for _, seed := range seeds {
		grade := grades[seed.GradeName]
		classItem := classes[fmt.Sprintf("%s-%s", seed.GradeName, seed.ClassName)]
		guardian := guardians[seed.GuardianPhone]
		items = append(items, studentModel.Student{
			Name:          seed.Name,
			Gender:        seed.Gender,
			SchoolID:      school.Id.String(),
			SchoolName:    school.Name,
			GradeID:       grade.Id.String(),
			Grade:         seed.GradeName,
			ClassID:       classItem.Id.String(),
			ClassName:     seed.ClassName,
			GuardianID:    guardian.Id.String(),
			GuardianName:  guardian.Name,
			GuardianPhone: guardian.Phone,
			Status:        "active",
		})
	}
	if err := tx.Create(&items).Error; err != nil {
		return nil, err
	}

	result := make(map[string]studentModel.Student, len(items))
	for _, item := range items {
		result[item.Name] = item
	}
	return result, nil
}

func createDemoGuardianBindings(tx *gorm.DB, students map[string]studentModel.Student, guardians map[string]guardianprofileModel.Profile) error {
	items := make([]guardianbindingModel.Binding, 0, len(students))
	for _, student := range students {
		guardian := guardians[student.GuardianPhone]
		items = append(items, guardianbindingModel.Binding{
			StudentID:     student.Id.String(),
			GuardianUserID: guardian.UserID,
			GuardianName:  guardian.Name,
			GuardianPhone: guardian.Phone,
			Relationship:  "家长",
			IsPrimary:     true,
			Status:        "active",
		})
	}
	return tx.Create(&items).Error
}

func createDemoServiceDays(tx *gorm.DB) error {
	today := time.Now()
	days := []servicedayModel.Day{
		buildDemoServiceDay(today.AddDate(0, 0, -1), "昨日演示服务日"),
		buildDemoServiceDay(today, "今日演示服务日"),
	}
	return tx.Create(&days).Error
}

func buildDemoServiceDay(day time.Time, remark string) servicedayModel.Day {
	return servicedayModel.Day{
		ServiceDate:               day.Format("2006-01-02"),
		HasMealService:            true,
		HasHomeworkService:        true,
		HasEveningHomeworkService: true,
		WorkHours:                 "16:30-20:30",
		Remark:                    remark,
	}
}

func createDemoServicePlans(tx *gorm.DB, students map[string]studentModel.Student) error {
	items := make([]studentserviceModel.Plan, 0, len(students))
	startDate := time.Now().AddDate(0, 0, -10).Format("2006-01-02")
	endDate := time.Now().AddDate(0, 1, 5).Format("2006-01-02")

	for _, student := range students {
		items = append(items, studentserviceModel.Plan{
			StudentID:        student.Id.String(),
			PaymentStatus:    "paid",
			PaymentAmount:    1280,
			PaidAt:           time.Now().AddDate(0, 0, -5).Format("2006-01-02"),
			ServiceStartDate: startDate,
			ServiceEndDate:   endDate,
			Remark:           "演示托管服务计划",
		})
	}

	return tx.Create(&items).Error
}

func createDemoPaymentRecords(tx *gorm.DB, students map[string]studentModel.Student) error {
	items := make([]paymentrecordModel.Record, 0, len(students))
	for _, student := range students {
		items = append(items, paymentrecordModel.Record{
			StudentID:       student.Id.String(),
			StudentName:     student.Name,
			SchoolID:        student.SchoolID,
			SchoolName:      student.SchoolName,
			GradeID:         student.GradeID,
			GradeName:       student.Grade,
			ClassID:         student.ClassID,
			ClassName:       student.ClassName,
			GuardianID:      student.GuardianID,
			GuardianName:    student.GuardianName,
			GuardianPhone:   student.GuardianPhone,
			PaymentType:     "晚托服务费",
			PaymentAmount:   1280,
			PeriodStartDate: time.Now().AddDate(0, 0, -10).Format("2006-01-02"),
			PeriodEndDate:   time.Now().AddDate(0, 1, 5).Format("2006-01-02"),
			PaidAt:          time.Now().AddDate(0, 0, -5).Format("2006-01-02"),
			Remark:          "演示数据：月度托管服务费用",
			Status:          "paid",
		})
	}
	return tx.Create(&items).Error
}

func createDemoHomeworkAssignments(
	tx *gorm.DB,
	school *schoolModel.School,
	classes map[string]classgroupModel.Class,
	teacher *teacherprofileModel.Profile,
) (map[string]homeworkassignmentModel.Assignment, error) {
	type assignmentSeed struct {
		ClassKey string
		Subject  string
		Content  []string
		Remark   string
	}

	today := time.Now().Format("2006-01-02")
	seeds := []assignmentSeed{
		{ClassKey: "四年级-一班", Subject: "数学", Content: []string{"完成《计算小能手》第 12 页 1-8 题", "整理今天错题并写出两种解法"}, Remark: "重点看简便运算"},
		{ClassKey: "四年级-一班", Subject: "语文", Content: []string{"朗读《观潮》并录音 1 次", "完成生字词抄写与词语解释"}, Remark: "家长签字即可"},
		{ClassKey: "四年级-一班", Subject: "英语", Content: []string{"跟读 Unit 4 单词 10 分钟", "完成练习册第 15 页"}, Remark: "注意单复数"},
		{ClassKey: "五年级-二班", Subject: "数学", Content: []string{"完成应用题专项训练 3 题", "把易错题整理到错题本"}, Remark: "过程要完整"},
		{ClassKey: "五年级-二班", Subject: "英语", Content: []string{"背诵 Unit 3 单词", "默写重点句型 2 组"}, Remark: "明早抽查"},
		{ClassKey: "五年级-二班", Subject: "科学", Content: []string{"观察植物叶片变化并记录", "准备下节课口头展示内容"}, Remark: "可结合生活观察"},
		{ClassKey: "六年级-一班", Subject: "语文", Content: []string{"完成阅读理解 1 篇", "摘抄作文素材 3 段"}, Remark: "训练概括能力"},
		{ClassKey: "六年级-一班", Subject: "数学", Content: []string{"完成分数应用题 5 题", "订正课堂练习"}, Remark: "检查单位是否统一"},
	}

	assignments := make([]homeworkassignmentModel.Assignment, 0, len(seeds))
	itemModels := make([]homeworkassignmentModel.Item, 0)
	for _, seed := range seeds {
		classItem := classes[seed.ClassKey]
		assignments = append(assignments, homeworkassignmentModel.Assignment{
			ServiceDate: today,
			SchoolID:    school.Id.String(),
			SchoolName:  school.Name,
			GradeName:   classItem.GradeName,
			ClassID:     classItem.Id.String(),
			ClassName:   classItem.Name,
			Subject:     seed.Subject,
			Content:     strings.Join(seed.Content, "\n"),
			Remark:      seed.Remark,
			TeacherID:   teacher.UserID,
			TeacherName: teacher.Name,
		})
	}
	if err := tx.Create(&assignments).Error; err != nil {
		return nil, err
	}

	for index, assignment := range assignments {
		for itemIndex, content := range seeds[index].Content {
			itemModels = append(itemModels, homeworkassignmentModel.Item{
				AssignmentID: assignment.Id.String(),
				Sort:         itemIndex + 1,
				Content:      content,
			})
		}
	}
	if err := tx.Create(&itemModels).Error; err != nil {
		return nil, err
	}

	result := make(map[string]homeworkassignmentModel.Assignment, len(assignments))
	for _, item := range assignments {
		result[fmt.Sprintf("%s-%s-%s", item.GradeName, item.ClassName, item.Subject)] = item
	}
	return result, nil
}

func createDemoHomeworkRecords(
	tx *gorm.DB,
	students map[string]studentModel.Student,
	assignments map[string]homeworkassignmentModel.Assignment,
	teacher *teacherprofileModel.Profile,
) error {
	type recordSeed struct {
		StudentName string
		Subject     string
		Status      string
		Remark      string
	}

	today := time.Now().Format("2006-01-02")
	seeds := []recordSeed{
		{StudentName: "林小满", Subject: "数学", Status: "completed", Remark: "两种解法都写出来了，完成较好"},
		{StudentName: "林小满", Subject: "语文", Status: "partial", Remark: "朗读完成，抄写还差一页"},
		{StudentName: "林小满", Subject: "英语", Status: "completed", Remark: "跟读积极，发音较准"},
		{StudentName: "林知远", Subject: "数学", Status: "completed", Remark: "应用题列式正确"},
		{StudentName: "林知远", Subject: "英语", Status: "completed", Remark: "默写完成"},
		{StudentName: "林知远", Subject: "科学", Status: "pending", Remark: "待补充观察记录"},
		{StudentName: "周沐阳", Subject: "数学", Status: "completed", Remark: "错题整理清楚"},
		{StudentName: "周沐阳", Subject: "语文", Status: "completed", Remark: "家长已签字"},
		{StudentName: "周沐阳", Subject: "英语", Status: "partial", Remark: "练习册完成，单词背诵需加强"},
		{StudentName: "许星禾", Subject: "数学", Status: "partial", Remark: "最后一题还需订正"},
		{StudentName: "许星禾", Subject: "英语", Status: "completed", Remark: "句型默写正确"},
		{StudentName: "许星禾", Subject: "科学", Status: "completed", Remark: "展示准备充分"},
		{StudentName: "陈书言", Subject: "语文", Status: "completed", Remark: "阅读理解答题完整"},
		{StudentName: "陈书言", Subject: "数学", Status: "completed", Remark: "分数题步骤清晰"},
	}

	items := make([]homeworkrecordModel.Record, 0, len(seeds))
	for _, seed := range seeds {
		student := students[seed.StudentName]
		assignment := assignments[fmt.Sprintf("%s-%s-%s", student.Grade, student.ClassName, seed.Subject)]
		items = append(items, homeworkrecordModel.Record{
			AssignmentID:   assignment.Id.String(),
			StudentID:      student.Id.String(),
			StudentName:    student.Name,
			SchoolName:     student.SchoolName,
			ClassName:      student.ClassName,
			ServiceDate:    today,
			Status:         seed.Status,
			Subject:        seed.Subject,
			SubjectSummary: assignment.Content,
			Remark:         seed.Remark,
			RecordedByID:   teacher.UserID,
			RecordedBy:     teacher.Name,
		})
	}
	return tx.Create(&items).Error
}

func createDemoMealRecords(tx *gorm.DB, students map[string]studentModel.Student, teacher *teacherprofileModel.Profile) error {
	today := time.Now().Format("2006-01-02")
	seeds := []struct {
		StudentName string
		Status      string
		Remark      string
	}{
		{StudentName: "林小满", Status: "completed", Remark: "用餐正常，胃口不错"},
		{StudentName: "林知远", Status: "absent", Remark: "今日请假，未用餐"},
		{StudentName: "周沐阳", Status: "completed", Remark: "已按时用餐"},
		{StudentName: "许星禾", Status: "completed", Remark: "用餐后已休息"},
		{StudentName: "陈书言", Status: "completed", Remark: "进餐积极"},
	}

	items := make([]mealrecordModel.Record, 0, len(seeds))
	for _, seed := range seeds {
		student := students[seed.StudentName]
		items = append(items, mealrecordModel.Record{
			StudentID:    student.Id.String(),
			StudentName:  student.Name,
			ServiceDate:  today,
			Status:       seed.Status,
			Remark:       seed.Remark,
			RecordedByID: teacher.UserID,
			RecordedBy:   teacher.Name,
		})
	}
	return tx.Create(&items).Error
}
