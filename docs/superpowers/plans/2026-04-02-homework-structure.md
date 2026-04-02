# Homework Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把每日作业升级为主表加子内容结构，并让作业记录按学生和科目唯一、依附当天作业。

**Architecture:** 后端保留现有每日作业主表并新增子内容表，接口同时返回兼容字段和结构化 `items`。前端每日作业改为编辑多条内容，作业记录新增面板视图并以当天已有作业为入口记录整体状态。

**Tech Stack:** Go + GORM + Fiber, React + TypeScript + Vite + shadcn/ui

---

### Task 1: 后端模型与迁移

**Files:**
- Create: `apps/api/internal/model/homeworkassignment/item.go`
- Modify: `apps/api/internal/model/homeworkassignment/assignment.go`
- Modify: `apps/api/pkg/db/migrate.go`
- Test: `apps/api/pkg/db/migrate_test.go`

- [ ] **Step 1: 写迁移失败测试**

```go
func TestAutoMigrateCreatesHomeworkAssignmentItemsAndMigratesLegacyContent(t *testing.T) {
    db := openTestDB(t)
    require.NoError(t, db.Exec(`CREATE TABLE assignments (
        id text primary key,
        created_at datetime,
        updated_at datetime,
        deleted_at datetime,
        service_date text not null,
        school_name text not null,
        class_name text not null,
        subject text,
        content text not null
    )`).Error)
    require.NoError(t, db.Exec(`INSERT INTO assignments (id, service_date, school_name, class_name, subject, content)
        VALUES ('a1', '2026-04-02', '沣东九小', '一班', '数学', '口算\n订正')`).Error)

    DB = db
    require.NoError(t, autoMigrate())

    var count int64
    require.NoError(t, db.Table("homework_assignment_items").Count(&count).Error)
    require.EqualValues(t, 2, count)
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd apps/api; go test ./pkg/db -run TestAutoMigrateCreatesHomeworkAssignmentItemsAndMigratesLegacyContent`
Expected: FAIL，因为 `homework_assignment_items` 还不存在

- [ ] **Step 3: 实现模型与迁移**

```go
type Item struct {
    base.BaseModel
    AssignmentID string `gorm:"size:36;index;not null" json:"assignmentId"`
    Sort         int    `gorm:"not null;default:0" json:"sort"`
    Content      string `gorm:"type:text;not null" json:"content"`
}

func (Item) TableName() string {
    return "homework_assignment_items"
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd apps/api; go test ./pkg/db -run TestAutoMigrateCreatesHomeworkAssignmentItemsAndMigratesLegacyContent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/internal/model/homeworkassignment/item.go apps/api/internal/model/homeworkassignment/assignment.go apps/api/pkg/db/migrate.go apps/api/pkg/db/migrate_test.go
git commit -m "feat: migrate homework assignment items"
```

### Task 2: 每日作业接口改为主表加子内容

**Files:**
- Modify: `apps/api/internal/api/homeworkassignment/handler.go`
- Test: `apps/api/internal/api/homeworkassignment/handler_test.go`

- [ ] **Step 1: 写失败测试**

```go
func TestCreateAssignmentAcceptsItemsAndRejectsDuplicateSubject(t *testing.T) {
    // 先创建一条数学作业，再创建同班同日同科目第二条，断言 400
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd apps/api; go test ./internal/api/homeworkassignment -run TestCreateAssignmentAcceptsItemsAndRejectsDuplicateSubject`
Expected: FAIL，因为接口还不支持 `items`

- [ ] **Step 3: 实现最小接口改动**

```go
type assignmentItemPayload struct {
    Content string `json:"content"`
}

type assignmentPayload struct {
    // ...
    Items []assignmentItemPayload `json:"items"`
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd apps/api; go test ./internal/api/homeworkassignment -run TestCreateAssignmentAcceptsItemsAndRejectsDuplicateSubject`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/internal/api/homeworkassignment/handler.go apps/api/internal/api/homeworkassignment/handler_test.go
git commit -m "feat: support homework assignment items"
```

### Task 3: 作业记录唯一性与依附校验

**Files:**
- Modify: `apps/api/internal/model/homeworkrecord/record.go`
- Modify: `apps/api/internal/api/homeworkrecord/handler.go`
- Test: `apps/api/internal/api/homeworkrecord/handler_test.go`

- [ ] **Step 1: 写失败测试**

```go
func TestCreateHomeworkRecordRequiresAssignmentAndRejectsDuplicateStudentSubject(t *testing.T) {
    // 无对应作业时报错；有作业后重复创建同学生同日同科目时报错
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd apps/api; go test ./internal/api/homeworkrecord -run TestCreateHomeworkRecordRequiresAssignmentAndRejectsDuplicateStudentSubject`
Expected: FAIL，因为还没有依附与唯一校验

- [ ] **Step 3: 实现最小代码**

```go
type Record struct {
    // ...
    AssignmentID string `gorm:"size:36;index" json:"assignmentId"`
    Subject      string `gorm:"size:32;index" json:"subject"`
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd apps/api; go test ./internal/api/homeworkrecord -run TestCreateHomeworkRecordRequiresAssignmentAndRejectsDuplicateStudentSubject`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/internal/model/homeworkrecord/record.go apps/api/internal/api/homeworkrecord/handler.go apps/api/internal/api/homeworkrecord/handler_test.go
git commit -m "feat: enforce homework record uniqueness"
```

### Task 4: 前端每日作业录入与展示

**Files:**
- Modify: `apps/admin/src/lib/server-data.ts`
- Modify: `apps/admin/src/pages/daily-homework.tsx`
- Modify: `apps/admin/src/pages/daily-homework-board.tsx`

- [ ] **Step 1: 写失败测试或最小类型约束**

```ts
type DailyHomeworkItem = {
  items: Array<{ id: string; content: string; sort: number }>;
};
```

- [ ] **Step 2: 运行验证确认现状不兼容**

Run: `pnpm test:admin -- daily-homework`
Expected: FAIL，现有表单和展示不认识 `items`

- [ ] **Step 3: 实现最小前端改动**

```ts
await saveDailyHomework({
  // ...
  items: form.contentItems.map((item) => ({ content: item.text.trim() })),
});
```

- [ ] **Step 4: 运行验证确认通过**

Run: `pnpm test:admin -- daily-homework`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/lib/server-data.ts apps/admin/src/pages/daily-homework.tsx apps/admin/src/pages/daily-homework-board.tsx
git commit -m "feat: edit homework as item lists"
```

### Task 5: 前端作业记录面板视图

**Files:**
- Modify: `apps/admin/src/pages/homework-records.tsx`
- Create: `apps/admin/src/pages/homework-record-board.tsx`

- [ ] **Step 1: 写失败测试或最小页面断言**

```tsx
it("renders one record entry per student subject", async () => {
  render(<HomeworkRecordsPage />);
  expect(await screen.findByText("面板视图")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test:admin -- homework-records`
Expected: FAIL，因为还没有面板视图

- [ ] **Step 3: 实现最小页面代码**

```tsx
<Tabs defaultValue="board">
  <TabsTrigger value="board">面板视图</TabsTrigger>
  <TabsTrigger value="list">列表视图</TabsTrigger>
</Tabs>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test:admin -- homework-records`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/homework-records.tsx apps/admin/src/pages/homework-record-board.tsx
git commit -m "feat: add homework record board"
```

### Task 6: 全量验证

**Files:**
- Modify: `docs/superpowers/specs/2026-04-02-homework-structure-design.md`
- Modify: `docs/superpowers/plans/2026-04-02-homework-structure.md`

- [ ] **Step 1: 运行后端测试**

Run: `cd apps/api; go test ./...`
Expected: PASS

- [ ] **Step 2: 运行前端测试与构建**

Run: `pnpm test:admin && pnpm build:admin`
Expected: PASS

- [ ] **Step 3: 人工检查需求清单**

```text
- 每日作业按学校/班级/日期/科目唯一
- 一份作业支持多条内容
- 作业记录按学生/日期/科目唯一
- 作业记录依附当天已有作业
- 作业记录有面板视图
```

- [ ] **Step 4: 更新文档中的实际验证结果**

```text
记录哪些命令已运行，哪些因环境限制未运行
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-02-homework-structure-design.md docs/superpowers/plans/2026-04-02-homework-structure.md
git commit -m "docs: record homework structure plan"
```
