const { getMealRecords, getHomeworkRecords } = require("../../services/records");
const { getSession, isLoggedIn, isGuardian, canEdit } = require("../../store/session");
const { getStatusName, getStatusTagType, requireAuth } = require("../../utils/permission");
const { getToday, shiftDate, formatDateCN, formatDate } = require("../../utils/date");

Page({
  data: {
    activeTab: 0,
    currentDate: "",
    dateDisplay: "",
    showCalendar: false,
    calendarDate: null,
    canEdit: false,
    mealStatus: "",
    statusOptions: [
      { text: "全部", value: "" },
      { text: "已完成", value: "completed" },
      { text: "缺勤", value: "absent" },
    ],
    mealGroups: [],
    homeworkGroups: [],
    mealStudentIndex: 0,
    homeworkStudentIndex: 0,
    currentGroups: [],
    currentRecords: [],
    currentStudentIndex: 0,
    currentStudentName: "",
    currentStudentMeta: "",
    currentEmptyText: "暂无记录",
  },

  onShow() {
    if (!requireAuth()) return;

    const currentDate = this.data.currentDate || getToday();
    this.setData({
      currentDate,
      dateDisplay: formatDateCN(currentDate),
      canEdit: canEdit(),
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

  onMealStatusTap(e) {
    const value = e.currentTarget.dataset.value || "";
    if (value === this.data.mealStatus) return;
    this.setData({ mealStatus: value, mealStudentIndex: 0 });
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
    if (!isLoggedIn()) return;

    const params = { serviceDate: this.data.currentDate };
    const session = getSession();
    if (isGuardian()) {
      params.guardianPhone = session.user?.phone;
    }

    try {
      const mealParams = { ...params };
      if (this.data.mealStatus) {
        mealParams.status = this.data.mealStatus;
      }

      const [meals, homework] = await Promise.all([
        getMealRecords(mealParams).catch(() => ({ items: [] })),
        getHomeworkRecords(params).catch(() => ({ items: [] })),
      ]);

      const mealList = (meals.items || meals || []).map((item) => ({
        ...item,
        statusText: getStatusName(item.status),
        tagType: getStatusTagType(item.status),
      }));
      const homeworkList = (homework.items || homework || []).map((item) => ({
        ...item,
        statusText: getStatusName(item.status),
        tagType: getStatusTagType(item.status),
      }));

      this.setData({
        mealGroups: buildStudentGroups(mealList),
        homeworkGroups: buildStudentGroups(homeworkList),
      });
      this.updateCurrentPanel();
    } catch (e) {
      console.warn("加载记录失败", e);
      this.setData({
        mealGroups: [],
        homeworkGroups: [],
        currentGroups: [],
        currentRecords: [],
        currentStudentName: "",
        currentStudentMeta: "",
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
        currentRecords: [],
        currentStudentIndex: 0,
        currentStudentName: "",
        currentStudentMeta: "",
        currentEmptyText: activeTab === 0 ? "暂无用餐记录" : "暂无作业记录",
      });
      return;
    }

    const currentGroup = groups[selectedIndex];
    this.setData({
      [indexKey]: selectedIndex,
      currentGroups: groups,
      currentRecords: currentGroup.items,
      currentStudentIndex: selectedIndex,
      currentStudentName: currentGroup.studentName,
      currentStudentMeta: currentGroup.meta,
      currentEmptyText: activeTab === 0 ? "暂无用餐记录" : "暂无作业记录",
    });
  },

  goMealEdit(e) {
    if (!canEdit()) return;
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/meal-record/edit?id=${id}` });
  },

  goHomeworkEdit(e) {
    if (!canEdit()) return;
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/homework-record/edit?id=${id}` });
  },

  goRecordDetail(e) {
    if (this.data.activeTab === 0) {
      this.goMealEdit(e);
      return;
    }
    this.goHomeworkEdit(e);
  },

  onAdd() {
    if (this.data.activeTab === 0) {
      wx.navigateTo({ url: `/pages/meal-record/edit?date=${this.data.currentDate}` });
      return;
    }
    wx.navigateTo({ url: `/pages/homework-record/edit?date=${this.data.currentDate}` });
  },
});

function buildStudentGroups(records) {
  const map = {};

  records.forEach((item) => {
    const key = item.studentId || item.studentName;
    if (!map[key]) {
      map[key] = {
        key,
        studentName: item.studentName || "未命名学生",
        meta: buildStudentMeta(item),
        items: [],
      };
    }
    map[key].items.push(item);
  });

  return Object.keys(map).map((key) => map[key]);
}

function buildStudentMeta(item) {
  const parts = [];
  if (item.gradeName) parts.push(item.gradeName);
  if (item.className) parts.push(item.className);
  if (!parts.length && item.schoolName) parts.push(item.schoolName);
  return parts.join(" ");
}
