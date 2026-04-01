const { getSession } = require("../../store/session");
const { getToday } = require("../../utils/date");
const {
  getDailyHomework,
  getHomeConfig,
  getHomeworkRecords,
  getMealRecords,
  getOverview,
  getServiceDays,
  getStudents,
} = require("../../services/records");

Page({
  data: {
    activeRole: "",
    banners: [],
    highlightItems: [],
    homeAnnouncement: "",
    homeHeroSubtitle: "",
    homeHeroTitle: "",
    identityLabel: "",
    isManager: false,
    metrics: [],
    quickActions: [],
    serviceDate: getToday(),
  },
  onShow() {
    this.loadPage();
  },
  handleQuickAction(event) {
    const action = event.currentTarget.dataset.action;
    switch (action) {
      case "meal":
        wx.switchTab({ url: "/pages/meal/index" });
        return;
      case "homework":
        wx.switchTab({ url: "/pages/homework/index" });
        return;
      case "mine":
        wx.switchTab({ url: "/pages/mine/index" });
        return;
      case "students":
        wx.navigateTo({ url: "/pages/student-management/index" });
        return;
      case "calendar":
        wx.navigateTo({ url: "/pages/service-calendar/index" });
        return;
      default:
        return;
    }
  },
  async loadPage() {
    const session = getSession();
    const serviceDate = this.data.serviceDate;
    const homeConfig = await getHomeConfig().catch(() => null);
    const banners = homeConfig && Array.isArray(homeConfig.banners) ? homeConfig.banners : [];
    const homeHeroTitle = homeConfig && homeConfig.heroTitle ? homeConfig.heroTitle : "";
    const homeHeroSubtitle = homeConfig && homeConfig.heroSubtitle ? homeConfig.heroSubtitle : "";
    const homeAnnouncement = homeConfig && homeConfig.announcement ? homeConfig.announcement : "";

    if (!session.token || !session.user) {
      this.setData({
        activeRole: "",
        banners,
        homeAnnouncement,
        homeHeroSubtitle,
        homeHeroTitle,
        highlightItems: [],
        identityLabel: "未登录",
        isManager: false,
        metrics: [],
        quickActions: [{ action: "mine", label: "登录", value: "微信手机号" }],
      });
      return;
    }

    const activeRole = session.activeRole || (session.user.roles || [])[0] || "";
    const isManager = activeRole === "teacher" || activeRole === "admin";
    const [overview, students, mealRecords, homeworkRecords, dailyHomework, serviceDays] =
      await Promise.all([
        getOverview().catch(() => null),
        getStudents(activeRole === "guardian" ? { guardianPhone: session.user.phone } : {}),
        getMealRecords({ serviceDate }),
        getHomeworkRecords({ serviceDate }),
        getDailyHomework({ serviceDate }),
        getServiceDays({ serviceDate }),
      ]);

    const metrics =
      overview && Array.isArray(overview.metrics) && isManager
        ? overview.metrics.map((item) => ({
            label: item.label,
            value: String(item.value),
          }))
        : activeRole === "teacher"
          ? buildTeacherMetrics(students, mealRecords, homeworkRecords, dailyHomework)
          : activeRole === "admin"
            ? buildAdminMetrics(students, dailyHomework, serviceDays)
          : buildGuardianMetrics(students, mealRecords, homeworkRecords, serviceDays);

    const highlightItems =
      activeRole === "teacher"
        ? buildTeacherTips(students, mealRecords, homeworkRecords, dailyHomework)
        : activeRole === "admin"
          ? buildAdminTips(students, serviceDays, dailyHomework)
          : buildGuardianTips(students, mealRecords, homeworkRecords, serviceDays);

    this.setData({
      activeRole,
      banners,
      highlightItems: highlightItems.filter(Boolean),
      homeAnnouncement,
      homeHeroSubtitle,
      homeHeroTitle,
      identityLabel: buildIdentityLabel(session.user.displayName, activeRole),
      isManager,
      metrics,
      quickActions: buildQuickActions(activeRole),
    });
  },
});

function buildQuickActions(activeRole) {
  if (activeRole === "teacher") {
    return [
      { action: "meal", label: "用餐", value: "录入" },
      { action: "homework", label: "作业", value: "录入" },
      { action: "students", label: "学生", value: "管理" },
      { action: "mine", label: "我的", value: "账号" },
    ];
  }

  if (activeRole === "admin") {
    return [
      { action: "students", label: "学生", value: "管理" },
      { action: "calendar", label: "日历", value: "服务" },
      { action: "meal", label: "用餐", value: "查看" },
      { action: "homework", label: "作业", value: "查看" },
    ];
  }

  return [
    { action: "meal", label: "用餐", value: "查看" },
    { action: "homework", label: "作业", value: "查看" },
    { action: "mine", label: "我的", value: "账号" },
  ];
}

function buildIdentityLabel(name, activeRole) {
  const roleMap = {
    admin: "管理员",
    guardian: "监护人",
    teacher: "教师",
  };

  return [name || "", roleMap[activeRole] || ""].filter(Boolean).join(" · ");
}

function buildTeacherMetrics(students, mealRecords, homeworkRecords, assignments) {
  const completedMeals = mealRecords.filter((item) => item.status === "completed").length;
  const touchedHomework = homeworkRecords.filter((item) =>
    ["completed", "partial"].includes(item.status)
  ).length;

  return [
    { label: "在托学生", value: String(students.length) },
    { label: "已登记用餐", value: String(completedMeals) },
    { label: "已记录作业", value: String(touchedHomework) },
    { label: "今日作业模板", value: String(assignments.length) },
  ];
}

function buildGuardianMetrics(students, mealRecords, homeworkRecords, serviceDays) {
  const studentIds = students.map((item) => item.id);
  const familyMeals = mealRecords.filter((item) => studentIds.includes(item.studentId));
  const familyHomework = homeworkRecords.filter((item) => studentIds.includes(item.studentId));
  const day = serviceDays[0];

  return [
    { label: "绑定学生", value: String(students.length) },
    { label: "今日用餐反馈", value: String(familyMeals.length) },
    { label: "今日作业反馈", value: String(familyHomework.length) },
    {
      label: "今日服务",
      value: day
        ? `${day.hasMealService ? "用餐" : "--"} / ${day.hasHomeworkService ? "作业" : "--"}`
        : "待确认",
    },
  ];
}

function buildAdminMetrics(students, assignments, serviceDays) {
  const campusesWithMeal = new Set(
    serviceDays.filter((item) => item.hasMealService).map((item) => item.campusId)
  );
  const campusesWithHomework = new Set(
    serviceDays.filter((item) => item.hasHomeworkService).map((item) => item.campusId)
  );

  return [
    { label: "在托学生", value: String(students.length) },
    { label: "开放用餐校区", value: String(campusesWithMeal.size) },
    { label: "开放作业校区", value: String(campusesWithHomework.size) },
    { label: "今日作业模板", value: String(assignments.length) },
  ];
}

function buildTeacherTips(students, mealRecords, homeworkRecords, assignments) {
  const pendingMeals = Math.max(students.length - mealRecords.length, 0);
  const pendingHomework = Math.max(students.length - homeworkRecords.length, 0);

  return [
    { label: "学生", value: String(students.length) },
    { label: "用餐待处理", value: String(pendingMeals) },
    { label: "作业待处理", value: String(pendingHomework) },
    { label: "作业模板", value: String(assignments.length) },
  ];
}

function buildGuardianTips(students, mealRecords, homeworkRecords, serviceDays) {
  const studentNames = students.map((item) => item.name).join("、");
  const dayRemark = serviceDays[0] ? serviceDays[0].remark : "今日服务安排待机构确认";

  return [
    studentNames ? { label: "学生", value: studentNames } : null,
    { label: "用餐反馈", value: String(mealRecords.length) },
    { label: "作业反馈", value: String(homeworkRecords.length) },
    dayRemark ? { label: "备注", value: dayRemark } : null,
  ];
}

function buildAdminTips(students, serviceDays, assignments) {
  const unpaidCount = students.filter((item) => {
    return item.serviceSummary && item.serviceSummary.paymentStatus === "unpaid";
  }).length;
  const mealClosedCount = serviceDays.filter((item) => !item.hasMealService).length;
  const homeworkClosedCount = serviceDays.filter((item) => !item.hasHomeworkService).length;

  return [
    { label: "学生", value: String(students.length) },
    { label: "未缴费", value: String(unpaidCount) },
    { label: "服务关闭", value: `${mealClosedCount} / ${homeworkClosedCount}` },
    { label: "作业模板", value: String(assignments.length) },
  ];
}
