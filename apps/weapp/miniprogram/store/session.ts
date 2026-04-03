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
    sessionStore.activeRole = payload.activeRole || inferActiveRole(payload.user);
    sessionStore.loginType = payload.loginType || "";
    sessionStore.token = payload.token || "";
    sessionStore.user = payload.user || null;
  } catch (error) {
    console.warn("读取小程序会话失败", error);
  }
}

function setSession(payload) {
  sessionStore.activeRole = payload.activeRole || inferActiveRole(payload.user);
  sessionStore.loginType = payload.loginType || "";
  sessionStore.token = payload.token || "";
  sessionStore.user = payload.user || null;
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

function isAdmin() {
  return sessionStore.activeRole === "admin";
}

function isTeacher() {
  return sessionStore.activeRole === "teacher";
}

function isGuardian() {
  return sessionStore.activeRole === "guardian";
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
  if (!user || !Array.isArray(user.roles)) return [];
  return user.roles;
}

function hasMultipleRoles() {
  return getUserRoles().length > 1;
}

function inferActiveRole(user) {
  if (!user || !Array.isArray(user.roles) || user.roles.length === 0) {
    return "";
  }
  if (user.roles.includes("guardian")) return "guardian";
  if (user.roles.includes("teacher")) return "teacher";
  return user.roles[0];
}

module.exports = {
  hydrateSession,
  setSession,
  clearSession,
  getSession,
  setActiveRole,
  isLoggedIn,
  isAdmin,
  isTeacher,
  isGuardian,
  canEdit,
  canManage,
  getUserRoles,
  hasMultipleRoles,
};
