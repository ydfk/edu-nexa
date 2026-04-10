const {
  getDailyHomework,
  getHomeworkRecords,
  getMealRecords,
  getStudents,
} = require("../../services/records");
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
      canEdit: isLoggedIn() ? canEdit() : false,
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
        currentEmptyText: this.data.activeTab === 0 ? "登录后查看学生用餐记录" : "登录后查看学生作业记录",
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
      const studentMetaMap = buildStudentMetaMap(studentList);
      const mealList = buildMealCards(meals.items || meals || []);
      const homeworkList = buildHomeworkRecordList(homework.items || homework || []);
      const assignmentList = assignments.items || assignments || [];

      this.setData({
        mealGroups: buildMealGroups(studentList, mealList, studentMetaMap, currentDate),
        homeworkGroups: buildHomeworkGroups(studentList, assignmentList, homeworkList, studentMetaMap, currentDate),
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

    const recordId = e.currentTarget.dataset.recordId || "";
    const studentId = e.currentTarget.dataset.studentId || "";
    const subject = e.currentTarget.dataset.subject || "";
    const assignmentId = e.currentTarget.dataset.assignmentId || "";

    if (this.data.activeTab === 0) {
      if (recordId) {
        wx.navigateTo({ url: this.data.canEdit ? `/pages/meal-record/edit?id=${recordId}` : `/pages/meal-record/edit?id=${recordId}&mode=view` });
        return;
      }
      if (!this.data.canEdit || !studentId) {
        return;
      }
      wx.navigateTo({ url: `/pages/meal-record/edit?date=${this.data.currentDate}&studentId=${studentId}` });
      return;
    }

    if (recordId) {
      wx.navigateTo({ url: this.data.canEdit ? `/pages/homework-record/edit?id=${recordId}` : `/pages/homework-record/edit?id=${recordId}&mode=view` });
      return;
    }
    if (!this.data.canEdit || !studentId || !subject) {
      return;
    }

    const encodedSubject = encodeURIComponent(subject);
    const assignmentQuery = assignmentId ? `&assignmentId=${assignmentId}` : "";
    wx.navigateTo({
      url: `/pages/homework-record/edit?date=${this.data.currentDate}&studentId=${studentId}&subject=${encodedSubject}${assignmentQuery}`,
    });
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
    detailText: item.remark || "",
    id: item.id,
    imageUrls: item.imageUrls || [],
    metaText: item.serviceDate || "",
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

function buildMealGroups(students, records, studentMetaMap, serviceDate) {
  const recordMap = {};
  records.forEach((item) => {
    const key = item.studentId || item.studentName;
    if (!recordMap[key]) {
      recordMap[key] = [];
    }
    recordMap[key].push(item);
  });

  return (students || []).map((student) => ({
    key: student.id || student.name,
    placeholder: buildMealPlaceholder(serviceDate),
    studentId: student.id || "",
    studentName: student.name || "未命名学生",
    meta: buildStudentMeta(student, studentMetaMap),
    items: recordMap[student.id] || [],
  }));
}

function buildHomeworkGroups(students, assignments, records, studentMetaMap, serviceDate) {
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
      studentName: student.name || "未命名学生",
      meta: buildStudentMeta(student, studentMetaMap),
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
    imageUrls: record ? record.imageUrls || [] : [],
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
  if (assignment.teacherName) parts.push(`教师：${assignment.teacherName}`);
  return parts.join(" · ");
}

function buildHomeworkSummary(assignment) {
  const items = assignment.items || [];
  if (items.length > 0) {
    return items.map((item) => item.content).filter(Boolean).join("；");
  }
  return assignment.content || "";
}

function getAssignmentsForStudent(student, assignments) {
  if (!student) {
    return [];
  }

  return (assignments || []).filter((assignment) => {
    if (assignment.classId && student.classId) {
      return assignment.classId === student.classId;
    }
    return assignment.schoolName === student.schoolName && assignment.className === student.className;
  });
}

function buildHomeworkRecordKey(studentId, subject) {
  return `${studentId}::${subject || ""}`;
}

function buildStudentMetaMap(students) {
  const map = {};
  (students || []).forEach((item) => {
    if (!item || !item.id) return;
    map[item.id] = {
      grade: item.grade || "",
      className: item.className || "",
      schoolName: item.schoolName || "",
    };
  });
  return map;
}

function buildStudentMeta(item, studentMetaMap) {
  const studentMeta = (studentMetaMap && studentMetaMap[item.studentId || item.id]) || {};
  const parts = [];
  if (studentMeta.grade) parts.push(studentMeta.grade);
  else if (item.gradeName || item.grade) parts.push(item.gradeName || item.grade);
  if (studentMeta.className) parts.push(studentMeta.className);
  else if (item.className) parts.push(item.className);
  if (!parts.length) {
    if (studentMeta.schoolName) parts.push(studentMeta.schoolName);
    else if (item.schoolName) parts.push(item.schoolName);
  }
  return parts.join(" ");
}

function buildMealPlaceholder(serviceDate) {
  return {
    metaText: serviceDate,
    remark: "当天还没有记录这位学生的用餐情况。",
    title: "未记录用餐",
  };
}

function buildHomeworkPlaceholder(serviceDate) {
  return {
    metaText: serviceDate,
    remark: "当天还没有布置到这位学生的作业内容。",
    title: "暂无作业安排",
  };
}

function getMealStatusText(status) {
  const map = {
    completed: "已用餐",
    absent: "未用餐",
  };
  return map[status] || status;
}
