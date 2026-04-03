const { getMealRecords, getHomeworkRecords, getStudents } = require("../../services/records");
const { getSession, isGuardian, isLoggedIn } = require("../../store/session");
const { getStatusName, getStatusTagType } = require("../../utils/permission");
const { getToday } = require("../../utils/date");

Page({
  data: {
    loggedIn: false,
    heroBadge: "",
    heroTitle: "",
    heroDesc: "",
    introPoints: [],
    heroImage: "/assets/intro-campus.svg",
    recentItems: [],
  },

  onShow() {
    this.setData({
      loggedIn: isLoggedIn(),
    });
    this.setIntroContent();
    this.loadData();
  },

  onPullDownRefresh() {
    this.setData({ loggedIn: isLoggedIn() });
    this.setIntroContent();
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  setIntroContent() {
    this.setData({
      heroBadge: "家校协同与成长记录",
      heroTitle: "壹一小屋 学栖·EduNexa",
      heroDesc: "围绕孩子在园、在学、在家的关键记录，帮助家长、老师与机构把重要信息看得更集中、沟通得更顺畅。",
      heroImage: "/assets/intro-campus.svg",
      introPoints: [
        { id: "intro-1", title: "成长记录更集中", desc: "把作业、用餐和日常服务记录放在同一处查看，减少家长和老师来回切换。" },
        { id: "intro-2", title: "沟通反馈更清楚", desc: "重要动态会沉淀为可追溯的信息，让家校协同更顺手。" },
        { id: "intro-3", title: "关注重点更直接", desc: "首页优先展示对孩子最重要、最需要被及时看见的内容。" },
      ],
    });
  },

  async loadData() {
    const today = getToday();

    try {
      const params = { serviceDate: today, pageSize: 5 };
      const studentParams = {};
      if (isGuardian()) {
        studentParams.guardianPhone = getSession().user?.phone;
      }

      const [students, meals, homework] = await Promise.all([
        getStudents(studentParams).catch(() => []),
        getMealRecords(params).catch(() => ({ items: [] })),
        getHomeworkRecords(params).catch(() => ({ items: [] })),
      ]);
      const studentMetaMap = buildStudentMetaMap(students);

      const recentItems = [];
      (meals.items || meals || []).slice(0, 3).forEach((item) => {
        recentItems.push({
          id: `meal-${item.id}`,
          title: `${item.studentName} · 用餐`,
          desc: buildRecordDesc(item, "meal", studentMetaMap),
          tagText: getMealStatusText(item.status),
          tagType: getStatusTagType(item.status),
        });
      });
      (homework.items || homework || []).slice(0, 3).forEach((item) => {
        recentItems.push({
          id: `hw-${item.id}`,
          title: `${item.studentName} · 作业`,
          desc: buildRecordDesc(item, "homework", studentMetaMap),
          tagText: getStatusName(item.status),
          tagType: getStatusTagType(item.status),
        });
      });

      this.setData({
        recentItems: recentItems.length > 0 ? recentItems.slice(0, 5) : buildIntroActivities(),
      });
    } catch (e) {
      console.warn("加载最近动态失败", e);
      this.setData({ recentItems: buildIntroActivities() });
    }
  },
});

function buildRecordDesc(item, type, studentMetaMap) {
  const studentMeta = (studentMetaMap && studentMetaMap[item.studentId]) || {};
  const parts = [item.serviceDate];
  if (item.schoolName || studentMeta.schoolName) parts.push(item.schoolName || studentMeta.schoolName);
  if (item.gradeName || item.grade || studentMeta.grade) parts.push(item.gradeName || item.grade || studentMeta.grade);
  if (item.className || studentMeta.className) parts.push(item.className || studentMeta.className);
  if (type === "homework" && item.subject) parts.push(item.subject);
  return parts.filter(Boolean).join(" · ");
}

function buildStudentMetaMap(students) {
  const map = {};
  (students || []).forEach((item) => {
    if (!item || !item.id) return;
    map[item.id] = {
      schoolName: item.schoolName || "",
      grade: item.gradeName || item.grade || "",
      className: item.className || "",
    };
  });
  return map;
}

function buildIntroActivities() {
  return [
    {
      id: "intro-a",
      title: "家校协同会持续沉淀在这里",
      desc: "孩子的学习反馈、服务记录与阶段变化，会逐步汇成更完整的成长轨迹。",
      tagText: "介绍",
      tagType: "info",
    },
    {
      id: "intro-b",
      title: "重要记录优先被看见",
      desc: "壹一小屋 学栖·EduNexa 会尽量把家长和老师最常看的内容集中呈现，减少重复查找。",
      tagText: "说明",
      tagType: "warning",
    },
    {
      id: "intro-c",
      title: "从日常记录走向持续陪伴",
      desc: "记录不仅用于当下查看，也帮助机构、老师与家长形成更稳定的协同节奏。",
      tagText: "理念",
      tagType: "success",
    },
  ];
}

function getMealStatusText(status) {
  const map = {
    completed: "已用餐",
    absent: "未用餐",
  };
  return map[status] || status;
}
