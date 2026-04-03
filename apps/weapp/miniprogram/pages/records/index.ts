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
    showFilter: false,
    canEdit: false,
    mealStatus: "",
    statusOptions: [
      { text: "全部状态", value: "" },
      { text: "已完成", value: "completed" },
      { text: "缺勤", value: "absent" },
    ],
    mealRecords: [],
    homeworkRecords: [],
  },

  onShow() {
    const today = getToday();
    this.setData({
      currentDate: today,
      dateDisplay: formatDateCN(today),
      canEdit: canEdit(),
      showFilter: canEdit(),
    });
    this.loadRecords();
  },

  onPullDownRefresh() {
    this.loadRecords().finally(() => wx.stopPullDownRefresh());
  },

  onTabChange(e) {
    this.setData({ activeTab: e.detail.index });
  },

  prevDay() {
    const d = shiftDate(this.data.currentDate, -1);
    this.setData({ currentDate: d, dateDisplay: formatDateCN(d) });
    this.loadRecords();
  },

  nextDay() {
    const d = shiftDate(this.data.currentDate, 1);
    this.setData({ currentDate: d, dateDisplay: formatDateCN(d) });
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
    const d = formatDate(new Date(e.detail));
    this.setData({ showCalendar: false, currentDate: d, dateDisplay: formatDateCN(d) });
    this.loadRecords();
  },

  onMealStatusChange(e) {
    this.setData({ mealStatus: e.detail });
    this.loadRecords();
  },

  async loadRecords() {
    if (!isLoggedIn()) return;

    const params: Record<string, any> = { serviceDate: this.data.currentDate };
    const session = getSession();
    if (isGuardian()) {
      params.guardianPhone = session.user?.phone;
    }

    try {
      const mealParams: Record<string, any> = { ...params };
      if (this.data.mealStatus) mealParams.status = this.data.mealStatus;
      const meals = await getMealRecords(mealParams);
      const mealList = (meals.items || meals || []).map((m) => ({
        ...m,
        statusText: getStatusName(m.status),
        tagType: getStatusTagType(m.status),
      }));
      this.setData({ mealRecords: mealList });
    } catch (e) {
      console.warn("加载用餐记录失败", e);
    }

    try {
      const hw = await getHomeworkRecords(params);
      const hwList = (hw.items || hw || []).map((h) => ({
        ...h,
        statusText: getStatusName(h.status),
        tagType: getStatusTagType(h.status),
      }));
      this.setData({ homeworkRecords: hwList });
    } catch (e) {
      console.warn("加载作业记录失败", e);
    }
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

  onAdd() {
    if (this.data.activeTab === 0) {
      wx.navigateTo({ url: `/pages/meal-record/edit?date=${this.data.currentDate}` });
    } else {
      wx.navigateTo({ url: `/pages/homework-record/edit?date=${this.data.currentDate}` });
    }
  },
});
