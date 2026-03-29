export const dashboardMetrics = [
  { label: "在托学生", note: "较上周 +8 人", value: "126" },
  { label: "今日已登记用餐", note: "完成率 77.8%", value: "98" },
  { label: "今日已登记作业", note: "完成率 65.9%", value: "83" },
  { label: "待家长查看", note: "主要集中在经开校区", value: "14" },
];

export const campusSummaries = [
  {
    address: "武汉市洪山区南湖大道 88 号",
    code: "NH001",
    contactPerson: "李老师",
    contactPhone: "13800000001",
    id: "campus-nanhu",
    name: "南湖校区",
    serviceWindow: "17:30 - 20:30",
    staffCount: 9,
    status: "active",
    studentCount: 68,
  },
  {
    address: "武汉市经开区车城东路 18 号",
    code: "JK001",
    contactPerson: "王老师",
    contactPhone: "13800000002",
    id: "campus-jingkai",
    name: "经开校区",
    serviceWindow: "17:20 - 20:10",
    staffCount: 7,
    status: "active",
    studentCount: 58,
  },
];

export const studentSummaries = [
  {
    campusName: "南湖校区",
    grade: "三年级",
    guardianName: "陈女士",
    guardianPhone: "13900000001",
    homeworkStatus: "completed",
    id: "student-001",
    mealStatus: "completed",
    name: "陈一鸣",
    schoolName: "南湖小学",
  },
  {
    campusName: "经开校区",
    grade: "四年级",
    guardianName: "赵先生",
    guardianPhone: "13900000002",
    homeworkStatus: "in_progress",
    id: "student-002",
    mealStatus: "pending",
    name: "赵可欣",
    schoolName: "经开实验小学",
  },
  {
    campusName: "南湖校区",
    grade: "五年级",
    guardianName: "孙女士",
    guardianPhone: "13900000003",
    homeworkStatus: "pending_parent_followup",
    id: "student-003",
    mealStatus: "leave",
    name: "孙嘉乐",
    schoolName: "南湖小学",
  },
];

export const mealRecords = [
  {
    campusName: "南湖校区",
    id: "meal-001",
    recordedBy: "李老师",
    remark: "正常用餐",
    servedAt: "18:02",
    status: "completed",
    studentName: "陈一鸣",
  },
  {
    campusName: "经开校区",
    id: "meal-002",
    recordedBy: "王老师",
    remark: "等待到校确认",
    servedAt: "17:56",
    status: "pending",
    studentName: "赵可欣",
  },
  {
    campusName: "南湖校区",
    id: "meal-003",
    recordedBy: "李老师",
    remark: "请假未到校",
    servedAt: "--",
    status: "leave",
    studentName: "孙嘉乐",
  },
];

export const homeworkRecords = [
  {
    campusName: "南湖校区",
    id: "homework-001",
    recordedBy: "李老师",
    remark: "英语听写已订正",
    status: "completed",
    studentName: "陈一鸣",
    subjectSummary: "语文、数学、英语",
  },
  {
    campusName: "经开校区",
    id: "homework-002",
    recordedBy: "王老师",
    remark: "科学实验记录尚未整理",
    status: "in_progress",
    studentName: "赵可欣",
    subjectSummary: "数学、科学",
  },
  {
    campusName: "南湖校区",
    id: "homework-003",
    recordedBy: "李老师",
    remark: "口算题需要回家补完并拍照回传",
    status: "pending_parent_followup",
    studentName: "孙嘉乐",
    subjectSummary: "语文口算",
  },
];

export const guardianTouchpoints = [
  {
    channel: "微信服务通知",
    note: "18:30 自动推送当日用餐状态给监护人",
    status: "active",
    title: "晚餐完成通知",
  },
  {
    channel: "小程序查看页",
    note: "教师记录后，监护人可直接查看作业反馈",
    status: "active",
    title: "作业完成情况查看",
  },
  {
    channel: "班级群 + 家长私信",
    note: "异常情况仍需老师手动补充说明",
    status: "pending",
    title: "异常提醒",
  },
];
