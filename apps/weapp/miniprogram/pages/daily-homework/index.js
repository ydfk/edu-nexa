const { getDailyHomework } = require("../../services/records");
const { getSession, isLoggedIn, isGuardian, canEdit } = require("../../store/session");
const { requireAuth } = require("../../utils/permission");
const { getToday, shiftDate, formatDateCN, formatDate } = require("../../utils/date");

Page({
  data: {
    currentDate: "",
    dateDisplay: "",
    showCalendar: false,
    calendarDate: null,
    homeworkList: [],
    canEdit: false,
  },

  onShow() {
    if (!requireAuth()) return;
    const today = getToday();
    this.setData({
      currentDate: today,
      dateDisplay: formatDateCN(today),
      canEdit: canEdit(),
    });
    this.loadHomework();
  },

  onPullDownRefresh() {
    this.loadHomework().finally(() => wx.stopPullDownRefresh());
  },

  prevDay() {
    const d = shiftDate(this.data.currentDate, -1);
    this.setData({ currentDate: d, dateDisplay: formatDateCN(d) });
    this.loadHomework();
  },

  nextDay() {
    const d = shiftDate(this.data.currentDate, 1);
    this.setData({ currentDate: d, dateDisplay: formatDateCN(d) });
    this.loadHomework();
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
    this.loadHomework();
  },

  async loadHomework() {
    try {
      const params = { serviceDate: this.data.currentDate };
      if (isGuardian()) {
        const session = getSession();
        params.guardianPhone = session.user?.phone;
      }
      const res = await getDailyHomework(params);
      const list = res.items || res || [];
      this.setData({ homeworkList: list });
    } catch (e) {
      console.warn("加载每日作业失败", e);
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/daily-homework/detail?id=${id}` });
  },

  onAdd() {
    wx.navigateTo({ url: `/pages/daily-homework/detail?date=${this.data.currentDate}` });
  },
});

