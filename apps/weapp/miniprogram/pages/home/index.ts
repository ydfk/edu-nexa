const { getOverview } = require("../../services/common");
const { getMealRecords, getHomeworkRecords } = require("../../services/records");
const { getSession, isLoggedIn, isGuardian, canEdit } = require("../../store/session");
const { getRoleName, getStatusName, getStatusTagType } = require("../../utils/permission");
const { getToday } = require("../../utils/date");

Page({
  data: {
    greeting: "",
    displayName: "",
    roleName: "",
    roleTagType: "success",
    notice: "",
    kpiLabels: ["", "", "", ""],
    kpiValues: ["-", "-", "-", "-"],
    shortcuts: [],
    recentItems: [],
  },

  onShow() {
    if (!isLoggedIn()) {
      this.setData({
        greeting: getGreeting(),
        displayName: "访客",
        roleName: "未登录",
        roleTagType: "default",
        shortcuts: [
          { id: "login", label: "立即登录", icon: "user-o", url: "/pages/login/index", bg: "var(--color-primary-light)", color: "#07C160" },
        ],
      });
      return;
    }

    const session = getSession();
    const role = session.activeRole;
    this.setData({
      greeting: getGreeting(),
      displayName: session.user?.displayName || "用户",
      roleName: getRoleName(role),
      roleTagType: role === "admin" ? "info" : role === "teacher" ? "success" : "warning",
    });

    this.buildShortcuts();
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  buildShortcuts() {
    const items = [];
    if (canEdit()) {
      items.push(
        { id: "meal", label: "记录用餐", icon: "restaurant-o", url: "/pages/meal-record/edit", bg: "var(--color-primary-light)", color: "#07C160" },
        { id: "hw", label: "记录作业", icon: "edit", url: "/pages/homework-record/edit", bg: "var(--color-info-light)", color: "#1989FA" },
      );
    }
    items.push(
      { id: "students", label: "学生管理", icon: "friends-o", url: "/pages/students/index", bg: "var(--color-warning-light)", color: "#FF976A" },
      { id: "homework", label: "每日作业", icon: "notes-o", url: "/pages/daily-homework/index", bg: "#f3e8ff", color: "#8B5CF6" },
    );
    this.setData({ shortcuts: items });
  },

  async loadData() {
    const today = getToday();
    try {
      const overview = await getOverview();
      if (isGuardian()) {
        this.setData({
          kpiLabels: ["我的学生", "今日用餐", "今日作业", "服务状态"],
          kpiValues: [
            String(overview.studentCount || 0),
            String(overview.todayMealCount || 0),
            String(overview.todayHomeworkCount || 0),
            overview.serviceActive ? "正常" : "-",
          ],
        });
      } else {
        this.setData({
          kpiLabels: ["活跃学生", "今日用餐", "今日作业", "本月缴费"],
          kpiValues: [
            String(overview.studentCount || 0),
            String(overview.todayMealCount || 0),
            String(overview.todayHomeworkCount || 0),
            overview.monthlyPayment ? `¥${overview.monthlyPayment}` : "-",
          ],
        });
      }
    } catch (e) {
      console.warn("加载概览失败", e);
    }

    try {
      const params = { serviceDate: today, pageSize: 5 };
      const [meals, homework] = await Promise.all([
        getMealRecords(params).catch(() => ({ items: [] })),
        getHomeworkRecords(params).catch(() => ({ items: [] })),
      ]);

      const recentItems = [];
      (meals.items || meals || []).slice(0, 3).forEach((m) => {
        recentItems.push({
          id: `meal-${m.id}`,
          title: `${m.studentName} · 用餐`,
          desc: m.serviceDate,
          tagText: getStatusName(m.status),
          tagType: getStatusTagType(m.status),
        });
      });
      (homework.items || homework || []).slice(0, 3).forEach((h) => {
        recentItems.push({
          id: `hw-${h.id}`,
          title: `${h.studentName} · 作业`,
          desc: `${h.serviceDate} ${h.subject || ""}`,
          tagText: getStatusName(h.status),
          tagType: getStatusTagType(h.status),
        });
      });

      this.setData({ recentItems: recentItems.slice(0, 5) });
    } catch (e) {
      console.warn("加载最近动态失败", e);
    }
  },

  goMine() {
    wx.switchTab({ url: "/pages/mine/index" });
  },

  goRecords() {
    wx.switchTab({ url: "/pages/records/index" });
  },

  goShortcut(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    if (url.includes("/login/")) {
      wx.navigateTo({ url });
    } else if (url.includes("meal-record") || url.includes("homework-record") || url.includes("students") || url.includes("daily-homework")) {
      wx.navigateTo({ url });
    }
  },
});

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "凌晨好";
  if (h < 12) return "上午好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}
