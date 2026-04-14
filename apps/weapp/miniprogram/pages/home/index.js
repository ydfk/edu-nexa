const { getOverview } = require("../../services/common");
const { getMealRecords, getHomeworkRecords } = require("../../services/records");
const { getSession, isLoggedIn } = require("../../store/session");
const { getRoleName, getStatusName, getStatusTagType } = require("../../utils/permission");
const { getToday, formatDateCN } = require("../../utils/date");

Page({
  data: {
    loggedIn: false,
    displayName: "",
    roleName: "",
    currentDate: "",
    metrics: [],
    summaryCards: [],
  },

  onShow() {
    this.loadPage();
  },

  onPullDownRefresh() {
    this.loadPage().finally(() => wx.stopPullDownRefresh());
  },

  async loadPage() {
    const loggedIn = isLoggedIn();
    const today = getToday();
    const currentDate = formatDateCN(today);

    if (!loggedIn) {
      this.setData({
        loggedIn: false,
        displayName: "",
        roleName: "",
        currentDate,
        metrics: [],
        summaryCards: [],
      });
      return;
    }

    const session = getSession();
    const displayName = session.user?.displayName || session.user?.name || "用户";
    const roleName = getRoleName(session.activeRole);

    this.setData({
      loggedIn: true,
      displayName,
      roleName,
      currentDate,
      metrics: [],
      summaryCards: [],
    });

    try {
      const params = { serviceDate: today, pageSize: 6 };
      const [overview, mealResult, homeworkResult] = await Promise.all([
        getOverview().catch(() => ({ metrics: [] })),
        getMealRecords(params).catch(() => ({ items: [] })),
        getHomeworkRecords(params).catch(() => ({ items: [] })),
      ]);

      const mealItems = buildMealItems(mealResult.items || mealResult || []);
      const homeworkItems = buildHomeworkItems(homeworkResult.items || homeworkResult || []);

      this.setData({
        metrics: buildMetrics(overview.metrics || []),
        summaryCards: buildSummaryCards(mealItems, homeworkItems),
      });
    } catch (error) {
      console.warn("加载首页数据失败", error);
      this.setData({
        metrics: [],
        summaryCards: [],
      });
    }
  },
});

function buildMetrics(metrics) {
  const tones = ["primary", "info", "warning", "default"];
  return metrics.slice(0, 4).map((item, index) => ({
    id: `metric-${index}`,
    label: normalizeMetricLabel(item.label),
    value: item.value ?? 0,
    tone: tones[index] || "default",
  }));
}

function buildSummaryCards(mealItems, homeworkItems) {
  return [
    { id: "summary-meal", label: "用餐", value: mealItems.length },
    { id: "summary-homework", label: "作业", value: homeworkItems.length },
  ];
}

function normalizeMetricLabel(label) {
  const normalized = String(label || "").trim();
  if (!normalized) {
    return "--";
  }

  switch (normalized) {
    case "托管学生":
      return "学生";
    case "晚辅用餐已登记":
    case "晚辅用餐登记":
      return "用餐";
    case "作业完成已登记":
      return "作业";
    default:
      return normalized.replace("托管", "");
  }
}

function buildMealItems(items) {
  return items.slice(0, 6).map((item) => ({
    id: `meal-${item.id}`,
    title: item.studentName || "用餐记录",
    desc: buildMealRecordDesc(item),
    tagText: getMealStatusText(item.status),
    tagType: getStatusTagType(item.status),
    rawStatus: item.status || "",
    hasRemark: Boolean(item.remark),
    serviceDate: item.serviceDate || "",
  }));
}

function buildHomeworkItems(items) {
  return items.slice(0, 6).map((item) => ({
    id: `homework-${item.id}`,
    title: item.studentName || "作业记录",
    desc: buildHomeworkRecordDesc(item),
    tagText: getStatusName(item.status),
    tagType: getStatusTagType(item.status),
    rawStatus: item.status || "",
    hasRemark: Boolean(item.remark),
    serviceDate: item.serviceDate || "",
  }));
}

function buildMealRecordDesc(item) {
  const parts = [item.serviceDate, "用餐"];
  if (item.remark) {
    parts.push("有备注");
  }
  return parts.filter(Boolean).join(" · ");
}

function buildHomeworkRecordDesc(item) {
  const parts = [item.serviceDate, item.subject];
  if (item.remark) {
    parts.push("有备注");
  }
  return parts.filter(Boolean).join(" · ");
}

function getMealStatusText(status) {
  const map = {
    completed: "已用餐",
    absent: "未用餐",
  };
  return map[status] || status || "--";
}
