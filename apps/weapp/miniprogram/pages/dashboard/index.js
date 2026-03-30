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
    homeAnnouncement: "",
    homeHeroSubtitle: "",
    homeHeroTitle: "",
    isManager: false,
    metrics: [],
    serviceDate: getToday(),
    tips: [],
  },
  onShow() {
    this.loadPage();
  },
  async loadPage() {
    const session = getSession();
    const serviceDate = this.data.serviceDate;
    const homeConfig = await getHomeConfig().catch(() => null);
    const banners = homeConfig && Array.isArray(homeConfig.banners) ? homeConfig.banners : [];
    const homeHeroTitle =
      homeConfig && homeConfig.heroTitle ? homeConfig.heroTitle : "教师记录，监护人查看。";
    const homeHeroSubtitle =
      homeConfig && homeConfig.heroSubtitle
        ? homeConfig.heroSubtitle
        : "首页介绍、用餐反馈、作业反馈都围绕晚辅主链路展开。";
    const homeAnnouncement =
      homeConfig && homeConfig.announcement
        ? homeConfig.announcement
        : "首页介绍、图片和公告都可以在后台统一配置。";

    if (!session.token || !session.user) {
      this.setData({
        activeRole: "",
        banners,
        homeAnnouncement,
        homeHeroSubtitle,
        homeHeroTitle,
        isManager: false,
        metrics: [
          { label: "登录后可看", value: "角色视图" },
          { label: "当前支持", value: "管理员 / 教师 / 监护人" },
        ],
        tips: ["先在“我的”里完成微信手机号登录。"],
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

    const tips =
      activeRole === "teacher"
        ? buildTeacherTips(students, mealRecords, homeworkRecords, dailyHomework)
        : activeRole === "admin"
          ? buildAdminTips(students, serviceDays, dailyHomework)
        : buildGuardianTips(students, mealRecords, homeworkRecords, serviceDays);

    this.setData({
      activeRole,
      banners,
      homeAnnouncement,
      homeHeroSubtitle,
      homeHeroTitle,
      isManager,
      metrics,
      tips,
    });
  },
});

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
    `今日共有 ${students.length} 名在托学生需要跟进。`,
    pendingMeals > 0 ? `还有 ${pendingMeals} 名学生未登记用餐。` : "今日用餐记录已全部覆盖。",
    pendingHomework > 0
      ? `还有 ${pendingHomework} 名学生未登记作业状态。`
      : "今日作业记录已全部覆盖。",
    assignments.length > 0
      ? `已配置 ${assignments.length} 条学校班级作业模板。`
      : "今天还没有配置每日作业模板。",
  ];
}

function buildGuardianTips(students, mealRecords, homeworkRecords, serviceDays) {
  const studentNames = students.map((item) => item.name).join("、");
  const dayRemark = serviceDays[0] ? serviceDays[0].remark : "今日服务安排待机构确认";

  return [
    studentNames ? `当前账号已绑定：${studentNames}` : "当前手机号还没有绑定学生。",
    mealRecords.length > 0 ? "可以按日期查看孩子的用餐状态。" : "今天还没有看到用餐反馈。",
    homeworkRecords.length > 0 ? "可以按日期查看作业完成情况。" : "今天还没有看到作业反馈。",
    dayRemark,
  ];
}

function buildAdminTips(students, serviceDays, assignments) {
  const unpaidCount = students.filter((item) => {
    return item.serviceSummary && item.serviceSummary.paymentStatus === "unpaid";
  }).length;
  const mealClosedCount = serviceDays.filter((item) => !item.hasMealService).length;
  const homeworkClosedCount = serviceDays.filter((item) => !item.hasHomeworkService).length;

  return [
    `当前共有 ${students.length} 名学生需要维护服务状态。`,
    unpaidCount > 0 ? `还有 ${unpaidCount} 名学生处于未缴费或待续费状态。` : "当前学生缴费状态已维护。",
    mealClosedCount > 0 || homeworkClosedCount > 0
      ? "今天部分校区已关闭用餐或作业服务，请留意服务日历。"
      : "今天各校区的服务日历均已开启。",
    assignments.length > 0 ? "教师已录入部分每日作业模板。" : "今天还没有录入每日作业模板。",
  ];
}
