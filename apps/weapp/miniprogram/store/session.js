const storageKey = "edunexa.weapp.session.v1";

const sessionStore = {
  activeRole: "",
  loginType: "",
  token: "",
  user: null,
};

function hydrateSession() {
  try {
    const payload = wx.getStorageSync(storageKey);
    if (!payload || typeof payload !== "object") {
      return;
    }
    sessionStore.user = normalizeUser(payload.user);
    sessionStore.activeRole = payload.activeRole || inferActiveRole(sessionStore.user);
    sessionStore.loginType = payload.loginType || "";
    sessionStore.token = payload.token || "";
  } catch (error) {
    console.warn("读取小程序会话失败", error);
  }
}

function setSession(payload) {
  sessionStore.user = normalizeUser(payload.user);
  sessionStore.activeRole = payload.activeRole || inferActiveRole(sessionStore.user);
  sessionStore.loginType = payload.loginType || "";
  sessionStore.token = payload.token || "";
  try {
    wx.setStorageSync(storageKey, sessionStore);
  } catch (error) {
    console.warn("保存小程序会话失败", error);
  }
}

function clearSession() {
  sessionStore.activeRole = "";
  sessionStore.loginType = "";
  sessionStore.token = "";
  sessionStore.user = null;
  try {
    wx.removeStorageSync(storageKey);
  } catch (error) {
    console.warn("清理小程序会话失败", error);
  }
}

function getSession() {
  return {
    activeRole: sessionStore.activeRole,
    loginType: sessionStore.loginType,
    token: sessionStore.token,
    user: sessionStore.user,
  };
}

function setActiveRole(role) {
  sessionStore.activeRole = role || inferActiveRole(sessionStore.user);
  try {
    wx.setStorageSync(storageKey, sessionStore);
  } catch (error) {
    console.warn("更新小程序角色失败", error);
  }
}

function isLoggedIn() {
  return !!sessionStore.token && !!sessionStore.user;
}

function hasRole(role) {
  return getUserRoles().includes(role);
}

function isAdmin() {
  return hasRole("admin");
}

function isTeacher() {
  return !isAdmin() && hasRole("teacher");
}

function isGuardian() {
  return !isAdmin() && !isTeacher() && hasRole("guardian");
}

/** 管理员或教师可编辑 */
function canEdit() {
  return isAdmin() || isTeacher();
}

/** 仅管理员可管理 */
function canManage() {
  return isAdmin();
}

function getUserRoles() {
  const user = sessionStore.user;
  if (!user) return [];
  return normalizeRoles(user.roles);
}

function hasMultipleRoles() {
  return getUserRoles().length > 1;
}

function inferActiveRole(user) {
  const roles = normalizeRoles(user && user.roles);
  if (roles.length === 0) {
    return "";
  }
  if (roles.includes("admin")) return "admin";
  if (roles.includes("teacher")) return "teacher";
  if (roles.includes("guardian")) return "guardian";
  return roles[0];
}

function normalizeUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  return {
    ...user,
    roles: normalizeRoles(user.roles),
  };
}

function normalizeRoles(rawRoles) {
  if (Array.isArray(rawRoles)) {
    return rawRoles.filter(Boolean);
  }
  if (typeof rawRoles === "string") {
    return rawRoles
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

module.exports = {
  hydrateSession,
  setSession,
  clearSession,
  getSession,
  setActiveRole,
  isLoggedIn,
  hasRole,
  isAdmin,
  isTeacher,
  isGuardian,
  canEdit,
  canManage,
  getUserRoles,
  hasMultipleRoles,
};
