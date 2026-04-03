const { isLoggedIn, isAdmin, isTeacher, isGuardian, canEdit } = require("../store/session");

/** 检查登录状态，未登录则跳转登录页 */
function requireAuth() {
  if (!isLoggedIn()) {
    wx.redirectTo({ url: "/pages/login/index" });
    return false;
  }
  return true;
}

/** 检查是否有编辑权限（管理员或教师） */
function requireEditor() {
  if (!requireAuth()) return false;
  if (!canEdit()) {
    wx.showToast({ title: "无操作权限", icon: "none" });
    return false;
  }
  return true;
}

/** 检查是否为管理员 */
function requireAdmin() {
  if (!requireAuth()) return false;
  if (!isAdmin()) {
    wx.showToast({ title: "需要管理员权限", icon: "none" });
    return false;
  }
  return true;
}

/** 根据角色获取功能入口列表 */
function getFeatureEntries() {
  const entries = [
    { id: "students", title: "学生管理", icon: "friends-o", url: "/pages/students/index", roles: ["admin", "teacher", "guardian"] },
    { id: "daily-homework", title: "每日作业", icon: "notes-o", url: "/pages/daily-homework/index", roles: ["admin", "teacher", "guardian"] },
    { id: "guardians", title: "家长管理", icon: "contact", url: "/pages/guardians/index", roles: ["admin", "teacher"] },
    { id: "schools", title: "学校管理", icon: "home-o", url: "/pages/schools/index", roles: ["admin", "teacher"] },
    { id: "payments", title: "缴费管理", icon: "balance-o", url: "/pages/payments/index", roles: ["admin", "teacher", "guardian"] },
    { id: "teachers", title: "教师管理", icon: "manager-o", url: "/pages/teachers/index", roles: ["admin"] },
  ];

  const role = isAdmin() ? "admin" : isTeacher() ? "teacher" : "guardian";
  return entries.filter((e) => e.roles.includes(role));
}

/** 角色名称映射 */
function getRoleName(role) {
  const map = { admin: "管理员", teacher: "教师", guardian: "家长" };
  return map[role] || role;
}

/** 状态名称映射 */
function getStatusName(status) {
  const map = {
    active: "正常", paused: "暂停",
    completed: "已完成", absent: "缺勤", pending: "待处理", partial: "部分完成",
    paid: "已缴费", partial_refunded: "部分退款", refunded: "已退款",
  };
  return map[status] || status;
}

/** 状态标签类型映射 */
function getStatusTagType(status) {
  const map = {
    active: "success", completed: "success", paid: "success",
    paused: "default", pending: "warning", partial: "warning", partial_refunded: "warning",
    absent: "danger", refunded: "danger",
  };
  return map[status] || "default";
}

module.exports = {
  requireAuth,
  requireEditor,
  requireAdmin,
  getFeatureEntries,
  getRoleName,
  getStatusName,
  getStatusTagType,
};
