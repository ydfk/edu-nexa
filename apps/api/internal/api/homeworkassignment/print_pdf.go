package homeworkassignment

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"net/url"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/ydfk/edu-nexa/apps/api/internal/api/response"
	model "github.com/ydfk/edu-nexa/apps/api/internal/model/homeworkassignment"
	studentModel "github.com/ydfk/edu-nexa/apps/api/internal/model/student"
	"github.com/ydfk/edu-nexa/apps/api/internal/service"
	runtimeconfigService "github.com/ydfk/edu-nexa/apps/api/internal/service/runtimeconfig"
	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
	"github.com/ydfk/edu-nexa/apps/api/pkg/db"
	"github.com/ydfk/edu-nexa/apps/api/pkg/logger"
	"github.com/ydfk/edu-nexa/apps/api/pkg/util"
	"gorm.io/gorm"
)

const homeworkPrintBrowserEnv = "EDUNEXA_PDF_BROWSER"

type dailyHomeworkPrintGroup struct {
	SchoolName string
	GradeName  string
	ClassName  string
	Homework   []dailyHomeworkPrintSubject
	Students   []dailyHomeworkPrintStudent
}

type dailyHomeworkPrintSubject struct {
	Subject string
	Lines   []string
}

type dailyHomeworkPrintStudent struct {
	Name       string
	SchoolName string
	GradeName  string
	ClassName  string
}

type dailyHomeworkPrintSlip struct {
	StudentName string
	SchoolName  string
	GradeName   string
	ClassName   string
	DisplayDate string
	Subjects    []dailyHomeworkPrintSubject
}

type dailyHomeworkPrintPage struct {
	Slips []dailyHomeworkPrintSlip
}

type dailyHomeworkPrintDocument struct {
	DisplayDate string
	Pages       []dailyHomeworkPrintPage
}

func PrintPDF(c *fiber.Ctx) error {
	currentUser, err := service.CurrentUser(c)
	if err != nil {
		return response.Error(c, "认证失败，请先登录", fiber.StatusUnauthorized)
	}
	if !canPrintDailyHomework(currentUser.Roles) {
		return response.Error(c, "仅教师和管理员可以生成打印文件", fiber.StatusForbidden)
	}

	serviceDate := strings.TrimSpace(c.Query("serviceDate"))
	if serviceDate == "" {
		return response.Error(c, "日期不能为空", fiber.StatusBadRequest)
	}

	fileURL, relativePath, err := generateDailyHomeworkPDF(serviceDate)
	if err != nil {
		return response.Error(c, err.Error(), fiber.StatusBadRequest)
	}

	return response.Success(c, fiber.Map{
		"serviceDate": serviceDate,
		"url":         fileURL,
		"path":        relativePath,
	})
}

func canPrintDailyHomework(rawRoles string) bool {
	for _, role := range strings.Split(rawRoles, ",") {
		switch strings.TrimSpace(role) {
		case "admin", "teacher":
			return true
		}
	}
	return false
}

func generateDailyHomeworkPDF(serviceDate string) (string, string, error) {
	assignments, err := loadDailyHomeworkAssignments(serviceDate)
	if err != nil {
		return "", "", err
	}
	if len(assignments) == 0 {
		return "", "", errors.New("当天暂无可打印的每日作业")
	}

	subjectOrder := loadDailyHomeworkSubjectOrder()
	groups, err := buildDailyHomeworkPrintGroups(assignments, subjectOrder)
	if err != nil {
		return "", "", err
	}
	slips := buildDailyHomeworkPrintSlips(groups, formatDailyHomeworkDate(serviceDate))
	if len(slips) == 0 {
		return "", "", errors.New("当天暂无可打印的学生作业")
	}

	document := dailyHomeworkPrintDocument{
		DisplayDate: formatDailyHomeworkDate(serviceDate),
		Pages:       buildDailyHomeworkPrintPages(slips, 6),
	}

	htmlContent, err := renderDailyHomeworkPrintHTML(document)
	if err != nil {
		return "", "", errors.New("生成打印页面失败")
	}

	relativePath := filepath.Join("prints", "daily-homework", serviceDate+".pdf")
	absolutePath := filepath.Join(config.Current.Storage.Local.Dir, relativePath)
	if err := util.EnsureDir(absolutePath); err != nil {
		return "", "", errors.New("创建打印目录失败")
	}
	if err := renderDailyHomeworkHTMLToPDF(htmlContent, absolutePath); err != nil {
		return "", "", err
	}

	return buildDailyHomeworkPublicURL(relativePath), filepath.ToSlash(relativePath), nil
}

func loadDailyHomeworkAssignments(serviceDate string) ([]model.Assignment, error) {
	var assignments []model.Assignment
	err := db.DB.
		Preload("Items", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sort asc, created_at asc")
		}).
		Where("service_date = ?", serviceDate).
		Order("school_name asc, grade_name asc, class_name asc, created_at asc").
		Find(&assignments).Error
	if err != nil {
		return nil, errors.New("查询每日作业失败")
	}
	return assignments, nil
}

func buildDailyHomeworkPrintGroups(assignments []model.Assignment, subjectOrder []string) ([]dailyHomeworkPrintGroup, error) {
	type groupedAssignments struct {
		SchoolName string
		GradeName  string
		ClassName  string
		Items      []model.Assignment
	}

	groupedMap := make(map[string]*groupedAssignments)
	for _, item := range assignments {
		key := strings.Join([]string{
			strings.TrimSpace(item.SchoolName),
			strings.TrimSpace(item.GradeName),
			strings.TrimSpace(item.ClassName),
		}, "::")
		if _, exists := groupedMap[key]; !exists {
			groupedMap[key] = &groupedAssignments{
				SchoolName: strings.TrimSpace(item.SchoolName),
				GradeName:  strings.TrimSpace(item.GradeName),
				ClassName:  strings.TrimSpace(item.ClassName),
				Items:      []model.Assignment{},
			}
		}
		groupedMap[key].Items = append(groupedMap[key].Items, item)
	}

	var students []studentModel.Student
	if err := db.DB.
		Where("status = ?", "active").
		Order("school_name asc, grade asc, class_name asc, name asc").
		Find(&students).Error; err != nil {
		return nil, errors.New("查询学生失败")
	}

	keys := make([]string, 0, len(groupedMap))
	for key := range groupedMap {
		keys = append(keys, key)
	}
	slices.Sort(keys)

	results := make([]dailyHomeworkPrintGroup, 0, len(keys))
	for _, key := range keys {
		group := groupedMap[key]
		groupStudents := filterDailyHomeworkPrintStudents(students, group.SchoolName, group.GradeName, group.ClassName)
		if len(groupStudents) == 0 {
			continue
		}

		results = append(results, dailyHomeworkPrintGroup{
			SchoolName: group.SchoolName,
			GradeName:  group.GradeName,
			ClassName:  group.ClassName,
			Homework:   groupDailyHomeworkBySubject(group.Items, subjectOrder),
			Students:   groupStudents,
		})
	}

	return results, nil
}

func filterDailyHomeworkPrintStudents(students []studentModel.Student, schoolName string, gradeName string, className string) []dailyHomeworkPrintStudent {
	results := make([]dailyHomeworkPrintStudent, 0)
	for _, item := range students {
		if strings.TrimSpace(item.SchoolName) != schoolName {
			continue
		}
		if strings.TrimSpace(item.ClassName) != className {
			continue
		}
		if gradeName != "" && strings.TrimSpace(item.Grade) != gradeName {
			continue
		}
		results = append(results, dailyHomeworkPrintStudent{
			Name:       strings.TrimSpace(item.Name),
			SchoolName: strings.TrimSpace(item.SchoolName),
			GradeName:  strings.TrimSpace(item.Grade),
			ClassName:  strings.TrimSpace(item.ClassName),
		})
	}
	return results
}

func groupDailyHomeworkBySubject(assignments []model.Assignment, subjectOrder []string) []dailyHomeworkPrintSubject {
	subjectMap := make(map[string][]string)
	for _, item := range assignments {
		subject := strings.TrimSpace(item.Subject)
		if subject == "" {
			subject = "未分类"
		}
		subjectMap[subject] = append(subjectMap[subject], getDailyHomeworkContentLines(item)...)
	}

	results := make([]dailyHomeworkPrintSubject, 0, len(subjectMap))
	for _, subject := range subjectOrder {
		lines := subjectMap[subject]
		if len(lines) == 0 {
			continue
		}
		results = append(results, dailyHomeworkPrintSubject{Subject: subject, Lines: lines})
		delete(subjectMap, subject)
	}

	remainingSubjects := make([]string, 0, len(subjectMap))
	for subject := range subjectMap {
		remainingSubjects = append(remainingSubjects, subject)
	}
	slices.Sort(remainingSubjects)
	for _, subject := range remainingSubjects {
		results = append(results, dailyHomeworkPrintSubject{
			Subject: subject,
			Lines:   subjectMap[subject],
		})
	}
	return results
}

func getDailyHomeworkContentLines(item model.Assignment) []string {
	if len(item.Items) > 0 {
		lines := make([]string, 0, len(item.Items))
		for _, entry := range item.Items {
			content := strings.TrimSpace(entry.Content)
			if content == "" {
				continue
			}
			lines = append(lines, content)
		}
		if len(lines) > 0 {
			return lines
		}
	}

	lines := strings.Split(item.Content, "\n")
	results := make([]string, 0, len(lines))
	for _, line := range lines {
		content := strings.TrimSpace(line)
		if content == "" {
			continue
		}
		results = append(results, content)
	}
	return results
}

func buildDailyHomeworkPrintSlips(groups []dailyHomeworkPrintGroup, displayDate string) []dailyHomeworkPrintSlip {
	slips := make([]dailyHomeworkPrintSlip, 0)
	for _, group := range groups {
		for _, student := range group.Students {
			slips = append(slips, dailyHomeworkPrintSlip{
				StudentName: student.Name,
				SchoolName:  student.SchoolName,
				GradeName:   student.GradeName,
				ClassName:   student.ClassName,
				DisplayDate: displayDate,
				Subjects:    group.Homework,
			})
		}
	}
	return slips
}

func buildDailyHomeworkPrintPages(slips []dailyHomeworkPrintSlip, pageSize int) []dailyHomeworkPrintPage {
	if pageSize <= 0 {
		pageSize = 6
	}

	pages := make([]dailyHomeworkPrintPage, 0, (len(slips)+pageSize-1)/pageSize)
	for start := 0; start < len(slips); start += pageSize {
		end := min(start+pageSize, len(slips))
		pages = append(pages, dailyHomeworkPrintPage{
			Slips: slips[start:end],
		})
	}
	return pages
}

func renderDailyHomeworkPrintHTML(document dailyHomeworkPrintDocument) (string, error) {
	tpl, err := template.New("daily-homework-print").Funcs(template.FuncMap{
		"add": func(a int, b int) int { return a + b },
	}).Parse(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>每日作业打印 - {{.DisplayDate}}</title>
  <style>
    * { box-sizing: border-box; }
    @page { size: A4 portrait; margin: 8mm; }
    body {
      margin: 0;
      font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
      color: #0f172a;
      background: #ffffff;
    }
    .page {
      width: 194mm;
      min-height: 281mm;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 0;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }
    .slip {
      border: 1px dashed #94a3b8;
      padding: 4mm;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .slip__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 4mm;
      padding-bottom: 2mm;
      border-bottom: 0.3mm solid #cbd5e1;
    }
    .slip__name {
      font-size: 15pt;
      font-weight: 700;
      line-height: 1.2;
    }
    .slip__date {
      font-size: 9pt;
      color: #64748b;
      white-space: nowrap;
    }
    .slip__meta {
      margin-top: 2mm;
      font-size: 9.5pt;
      color: #475569;
      line-height: 1.4;
    }
    .subjects {
      margin-top: 3mm;
      display: flex;
      flex-direction: column;
      gap: 2.2mm;
      flex: 1;
    }
    .subject__title {
      font-size: 10pt;
      font-weight: 700;
      line-height: 1.35;
    }
    .subject__line {
      padding-left: 3.5mm;
      font-size: 9.5pt;
      line-height: 1.55;
      word-break: break-all;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  {{range .Pages}}
    <section class="page">
      {{range .Slips}}
        <article class="slip">
          <div class="slip__head">
            <div class="slip__name">{{.StudentName}}</div>
            <div class="slip__date">{{.DisplayDate}}</div>
          </div>
          <div class="slip__meta">{{.SchoolName}} / {{.GradeName}} / {{.ClassName}}</div>
          <div class="subjects">
            {{range .Subjects}}
              {{$subject := .}}
              <section class="subject">
                <div class="subject__title">【{{.Subject}}】</div>
                {{range $index, $line := .Lines}}
                  <div class="subject__line">{{if gt (len $subject.Lines) 1}}{{add $index 1}}. {{end}}{{$line}}</div>
                {{end}}
              </section>
            {{end}}
          </div>
        </article>
      {{end}}
    </section>
  {{end}}
</body>
</html>`)
	if err != nil {
		return "", err
	}

	var builder strings.Builder
	if err := tpl.Execute(&builder, document); err != nil {
		return "", err
	}
	return builder.String(), nil
}

func renderDailyHomeworkHTMLToPDF(htmlContent string, outputPath string) error {
	browserPath, err := resolveDailyHomeworkBrowserPath()
	if err != nil {
		return err
	}

	htmlFile, err := os.CreateTemp("", "edunexa-daily-homework-*.html")
	if err != nil {
		return errors.New("创建打印页面失败")
	}
	defer os.Remove(htmlFile.Name())

	if _, err := htmlFile.WriteString(htmlContent); err != nil {
		htmlFile.Close()
		return errors.New("写入打印页面失败")
	}
	if err := htmlFile.Close(); err != nil {
		return errors.New("保存打印页面失败")
	}

	tempPDF, err := os.CreateTemp("", "edunexa-daily-homework-*.pdf")
	if err != nil {
		return errors.New("创建打印文件失败")
	}
	tempPDFPath := tempPDF.Name()
	tempPDF.Close()
	os.Remove(tempPDFPath)
	defer os.Remove(tempPDFPath)

	profileDir, err := os.MkdirTemp("", "edunexa-daily-homework-browser-*")
	if err != nil {
		return errors.New("创建打印环境失败")
	}
	defer os.RemoveAll(profileDir)

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	headlessModes := []string{"--headless=new", "--headless"}
	for _, headlessMode := range headlessModes {
		args := []string{
			headlessMode,
			"--disable-gpu",
			"--allow-file-access-from-files",
			"--no-pdf-header-footer",
			"--disable-extensions",
			"--run-all-compositor-stages-before-draw",
			"--user-data-dir=" + profileDir,
			"--print-to-pdf=" + tempPDFPath,
			buildDailyHomeworkFileURL(htmlFile.Name()),
		}
		output, runErr := exec.CommandContext(ctx, browserPath, args...).CombinedOutput()
		if runErr == nil {
			pdfBytes, readErr := os.ReadFile(tempPDFPath)
			if readErr != nil || len(pdfBytes) == 0 {
				return errors.New("打印文件生成失败")
			}
			if writeErr := os.WriteFile(outputPath, pdfBytes, 0644); writeErr != nil {
				return errors.New("保存打印文件失败")
			}
			return nil
		}

		logger.Error("生成每日作业 PDF 失败: %v, output=%s", runErr, strings.TrimSpace(string(output)))
	}

	return errors.New("生成打印文件失败，请确认本机已安装 Edge 或 Chrome")
}

func resolveDailyHomeworkBrowserPath() (string, error) {
	candidates := []string{
		strings.TrimSpace(os.Getenv(homeworkPrintBrowserEnv)),
		`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`,
		`C:\Program Files\Microsoft\Edge\Application\msedge.exe`,
		`C:\Program Files\Google\Chrome\Application\chrome.exe`,
		`/usr/bin/google-chrome`,
		`/usr/bin/chromium`,
		`/usr/bin/chromium-browser`,
	}

	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}
	return "", errors.New("未找到可用的 PDF 渲染浏览器，请先安装 Edge 或 Chrome")
}

func buildDailyHomeworkFileURL(filePath string) string {
	u := &url.URL{
		Scheme: "file",
		Path:   filepath.ToSlash(filePath),
	}
	return u.String()
}

func buildDailyHomeworkPublicURL(relativePath string) string {
	publicPath := strings.TrimRight(config.Current.Storage.Local.PublicPath, "/")
	baseURL := strings.TrimRight(config.Current.Storage.Local.BaseURL, "/")
	cleanRelativePath := path.Join(strings.Split(filepath.ToSlash(relativePath), "/")...)
	return baseURL + publicPath + "/" + cleanRelativePath
}

func loadDailyHomeworkSubjectOrder() []string {
	snapshot, err := runtimeconfigService.GetSnapshot()
	if err != nil {
		return []string{}
	}

	var subjects []string
	if err := json.Unmarshal([]byte(snapshot.HomeworkSubjects), &subjects); err != nil {
		return []string{}
	}

	results := make([]string, 0, len(subjects))
	for _, subject := range subjects {
		trimmed := strings.TrimSpace(subject)
		if trimmed == "" {
			continue
		}
		results = append(results, trimmed)
	}
	return results
}

func formatDailyHomeworkDate(serviceDate string) string {
	dateValue, err := time.Parse("2006-01-02", serviceDate)
	if err != nil {
		return serviceDate
	}

	weekdays := []string{"周日", "周一", "周二", "周三", "周四", "周五", "周六"}
	return fmt.Sprintf("%d年%02d月%02d日 %s", dateValue.Year(), dateValue.Month(), dateValue.Day(), weekdays[dateValue.Weekday()])
}
