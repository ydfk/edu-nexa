const { isLoggedIn, isAdmin, getUserRoles, canEdit } = require("../store/session");

/** 检查登录状态，未登录则跳转登录页 */
function requireAuth() {
  if (!isLoggedIn()) {
    wx.showToast({ title: "请先登录", icon: "none" });
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

const featureEntries = [];

/** 根据角色获取功能入口列表 */
function getFeatureEntries() {
  const roles = isAdmin() ? ["admin", ...getUserRoles()] : getUserRoles();
  if (!roles.length) {
    return [];
  }

  return featureEntries.filter((entry) =>
    entry.roles.some((role) => roles.includes(role)),
  );
}

function getAllFeatureEntries() {
  return featureEntries.slice();
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
  getAllFeatureEntries,
  getRoleName,
  getStatusName,
  getStatusTagType,
};
