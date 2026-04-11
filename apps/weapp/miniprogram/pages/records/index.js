const { getDailyHomework, getHomeworkRecords, getMealRecords, getStudents } = require("../../services/records");
const { getSession, isLoggedIn, isGuardian, canEdit } = require("../../store/session");
const { getStatusName, getStatusTagType } = require("../../utils/permission");
const { getToday, shiftDate, formatDateCN, formatDate } = require("../../utils/date");

Page({
  data: {
    activeTab: 0,
    currentDate: "",
    dateDisplay: "",
    showCalendar: false,
    calendarDate: null,
    canEdit: false,
    allowRecordTap: false,
    mealGroups: [],
    homeworkGroups: [],
    mealStudentIndex: 0,
    homeworkStudentIndex: 0,
    currentGroups: [],
    currentGroup: null,
    currentRecords: [],
    currentStudentIndex: 0,
    currentEmptyText: "暂无记录",
    currentPlaceholder: null,
  },

  onShow() {
    const currentDate = this.data.currentDate || getToday();
    this.setData({
      currentDate,
      dateDisplay: formatDateCN(currentDate),
      canEdit: canEdit(),
      allowRecordTap: true,
    });
    this.loadRecords();
  },

  onPullDownRefresh() {
    this.loadRecords().finally(() => wx.stopPullDownRefresh());
  },

  onTabTap(e) {
    const tab = Number(e.currentTarget.dataset.tab || 0);
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });
    this.updateCurrentPanel();
  },

  prevDay() {
    const currentDate = shiftDate(this.data.currentDate, -1);
    this.setData({ currentDate, dateDisplay: formatDateCN(currentDate) });
    this.loadRecords();
  },

  nextDay() {
    const currentDate = shiftDate(this.data.currentDate, 1);
    this.setData({ currentDate, dateDisplay: formatDateCN(currentDate) });
    this.loadRecords();
  },

  openCalendar() {
    this.setData({
      showCalendar: true,
      calendarDate: new Date(`${this.data.currentDate}T00:00:00`).getTime(),
    });
  },

  closeCalendar() {
    this.setData({ showCalendar: false });
  },

  onCalendarConfirm(e) {
    const currentDate = formatDate(new Date(e.detail));
    this.setData({
      showCalendar: false,
      currentDate,
      dateDisplay: formatDateCN(currentDate),
    });
    this.loadRecords();
  },

  onStudentTap(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    if (this.data.activeTab === 0) {
      this.setData({ mealStudentIndex: index });
    } else {
      this.setData({ homeworkStudentIndex: index });
    }
    this.updateCurrentPanel();
  },

  async loadRecords() {
    if (!isLoggedIn()) {
      this.setData({
        mealGroups: [],
        homeworkGroups: [],
        currentGroups: [],
        currentGroup: null,
        currentRecords: [],
        currentStudentIndex: 0,
        currentEmptyText: this.data.activeTab === 0 ? "登录后查看用餐记录" : "登录后查看作业记录",
        currentPlaceholder: null,
      });
      return;
    }

    const currentDate = this.data.currentDate;
    const session = getSession();
    const studentParams = { status: "active" };
    if (isGuardian()) {
      studentParams.guardianPhone = session.user?.phone;
    }

    const recordParams = { serviceDate: currentDate };

    try {
      const [students, meals, homework, assignments] = await Promise.all([
        getStudents(studentParams).catch(() => []),
        getMealRecords(recordParams).catch(() => ({ items: [] })),
        getHomeworkRecords(recordParams).catch(() => ({ items: [] })),
        getDailyHomework(recordParams).catch(() => ({ items: [] })),
      ]);

      const studentList = students.items || students || [];
      const mealList = buildMealCards(meals.items || meals || []);
      const homeworkList = buildHomeworkRecordList(homework.items || homework || []);
      const assignmentList = assignments.items || assignments || [];

      this.setData({
        mealGroups: buildMealGroups(studentList, mealList, currentDate),
        homeworkGroups: buildHomeworkGroups(studentList, assignmentList, homeworkList, currentDate),
      });
      this.updateCurrentPanel();
    } catch (error) {
      console.warn("加载记录失败", error);
      this.setData({
        mealGroups: [],
        homeworkGroups: [],
        currentGroups: [],
        currentGroup: null,
        currentRecords: [],
        currentPlaceholder: null,
      });
    }
  },

  updateCurrentPanel() {
    const activeTab = this.data.activeTab;
    const groups = activeTab === 0 ? this.data.mealGroups : this.data.homeworkGroups;
    const indexKey = activeTab === 0 ? "mealStudentIndex" : "homeworkStudentIndex";
    let selectedIndex = this.data[indexKey] || 0;

    if (selectedIndex >= groups.length) {
      selectedIndex = 0;
    }

    if (!groups.length) {
      this.setData({
        [indexKey]: 0,
        currentGroups: [],
        currentGroup: null,
        currentRecords: [],
        currentStudentIndex: 0,
        currentEmptyText: activeTab === 0 ? "暂无用餐记录" : "暂无作业记录",
        currentPlaceholder: null,
      });
      return;
    }

    const currentGroup = groups[selectedIndex];
    const hasRecords = currentGroup.items.length > 0;
    this.setData({
      [indexKey]: selectedIndex,
      currentGroups: groups,
      currentGroup,
      currentRecords: currentGroup.items,
      currentStudentIndex: selectedIndex,
      currentEmptyText: activeTab === 0 ? "暂无用餐记录" : "暂无作业记录",
      currentPlaceholder: hasRecords ? null : currentGroup.placeholder || null,
    });
  },

  goRecordTap(e) {
    if (!isLoggedIn()) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    const recordId = String(e.currentTarget.dataset.recordId || "");
    const studentId = String(e.currentTarget.dataset.studentId || "");
    const subject = String(e.currentTarget.dataset.subject || "");
    const assignmentId = String(e.currentTarget.dataset.assignmentId || "");
    const editor = canEdit();
    const mode = editor ? "" : "&mode=view";

    if (this.data.activeTab === 0) {
      if (recordId) {
        wx.navigateTo({
          url: `/pages/meal-record/edit?id=${encodeURIComponent(recordId)}${mode}`,
        });
        return;
      }

      if (editor && studentId) {
        wx.navigateTo({
          url: `/pages/meal-record/edit?studentId=${encodeURIComponent(studentId)}&date=${encodeURIComponent(this.data.currentDate)}`,
        });
      }
      return;
    }

    if (recordId) {
      wx.navigateTo({
        url: `/pages/homework-record/edit?id=${encodeURIComponent(recordId)}${mode}`,
      });
      return;
    }

    if (editor && studentId && assignmentId) {
      wx.navigateTo({
        url: `/pages/homework-record/edit?studentId=${encodeURIComponent(studentId)}&assignmentId=${encodeURIComponent(assignmentId)}&subject=${encodeURIComponent(subject)}&date=${encodeURIComponent(this.data.currentDate)}`,
      });
      return;
    }

    if (editor) {
      wx.showToast({ title: "当天暂无可登记作业", icon: "none" });
    }
  },

  previewRecordImages(e) {
    const current = e.currentTarget.dataset.current || "";
    const urls = e.currentTarget.dataset.urls || [];
    if (!current || !Array.isArray(urls) || urls.length === 0) {
      return;
    }
    wx.previewImage({ current, urls });
  },
});

function buildMealCards(records) {
  return (records || []).map((item) => ({
    assignmentId: "",
    detailText: String(item.remark || ""),
    id: item.id,
    imageUrls: normalizeImageURLs(item.imageUrls),
    metaText: String(item.serviceDate || ""),
    recorded: true,
    recordId: item.id,
    statusText: getMealStatusText(item.status),
    studentId: item.studentId || "",
    subject: "",
    summaryText: "",
    tagType: getStatusTagType(item.status),
    title: "用餐记录",
  }));
}

function buildHomeworkRecordList(records) {
  return (records || []).map((item) => ({
    ...item,
    statusText: getStatusName(item.status),
    tagType: getStatusTagType(item.status),
  }));
}

function buildMealGroups(students, records, serviceDate) {
  const recordMap = {};
  records.forEach((item) => {
    const key = normalizeKey(item.studentId || item.studentName);
    if (!recordMap[key]) {
      recordMap[key] = [];
    }
    recordMap[key].push(item);
  });

  return (students || []).map((student) => ({
    key: student.id || student.name,
    placeholder: buildMealPlaceholder(serviceDate),
    studentId: student.id || "",
    studentName: buildStudentName(student),
    meta: buildStudentMeta(student),
    items: recordMap[normalizeKey(student.id)] || [],
  }));
}

function buildHomeworkGroups(students, assignments, records, serviceDate) {
  const recordMap = {};
  (records || []).forEach((item) => {
    recordMap[buildHomeworkRecordKey(item.studentId, item.subject)] = item;
  });

  return (students || []).map((student) => {
    const studentAssignments = getAssignmentsForStudent(student, assignments);
    return {
      key: student.id || student.name,
      placeholder: buildHomeworkPlaceholder(serviceDate),
      studentId: student.id || "",
      studentName: buildStudentName(student),
      meta: buildStudentMeta(student),
      items: studentAssignments.map((assignment) => buildHomeworkCard(student, assignment, recordMap)),
    };
  });
}

function buildHomeworkCard(student, assignment, recordMap) {
  const subject = assignment.subject || "未分类";
  const record = recordMap[buildHomeworkRecordKey(student.id, subject)] || null;
  return {
    assignmentId: assignment.id || "",
    detailText: record && record.remark ? `备注：${record.remark}` : "",
    id: record ? record.id : `${student.id}-${assignment.id || subject}`,
    imageUrls: normalizeImageURLs(record ? record.imageUrls : []),
    metaText: buildHomeworkMetaText(assignment),
    recorded: !!record,
    recordId: record ? record.id : "",
    statusText: record ? record.statusText : "未记录",
    studentId: student.id || "",
    subject,
    summaryText: buildHomeworkSummary(assignment),
    tagType: record ? record.tagType : "default",
    title: subject,
  };
}

function buildHomeworkMetaText(assignment) {
  const parts = [];
  if (assignment.serviceDate) parts.push(assignment.serviceDate);
  return parts.join(" · ");
}

function buildHomeworkSummary(assignment) {
  const items = assignment.items || [];
  if (items.length > 0) {
    return items
      .map((item) => item.content)
      .filter(Boolean)
      .join("；");
  }
  return assignment.content || "";
}

function getAssignmentsForStudent(student, assignments) {
  if (!student) {
    return [];
  }

  return (assignments || []).filter((assignment) => {
    if (assignment.classId && student.classId) {
      return String(assignment.classId) === String(student.classId);
    }
    return assignment.schoolName === student.schoolName && assignment.className === student.className;
  });
}

function buildHomeworkRecordKey(studentId, subject) {
  return `${normalizeKey(studentId)}::${normalizeKey(subject)}`;
}

function buildStudentName(student) {
  return String(student?.name || student?.studentName || student?.id || "--");
}

function buildStudentMeta(student) {
  const parts = [
    student?.schoolName,
    student?.gradeName || student?.grade,
    student?.className,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return parts.join(" ");
}

function buildMealPlaceholder(serviceDate) {
  return {
    metaText: serviceDate,
    remark: "当天还没有记录用餐情况。",
    title: "未记录用餐",
  };
}

function buildHomeworkPlaceholder(serviceDate) {
  return {
    metaText: serviceDate,
    remark: "当天还没有记录作业内容。",
    title: "暂无作业记录",
  };
}

function getMealStatusText(status) {
  const map = {
    completed: "已用餐",
    absent: "未用餐",
  };
  return map[status] || status;
}

function normalizeImageURLs(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }
  try {
    const parsed = JSON.parse(String(raw));
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    }
  } catch (error) {
    // 兼容逗号分隔的历史数据
  }
  return String(raw)
    .split(",")
    .map((item) => item.trim().replace(/^\[/, "").replace(/\]$/, "").replace(/^"/, "").replace(/"$/, ""))
    .filter(Boolean);
}

function normalizeKey(value) {
  return String(value || "").trim();
}
