const storageKey = "edunexa.weapp.session.v1";

const sessionStore = {
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

    sessionStore.loginType = payload.loginType || "";
    sessionStore.token = payload.token || "";
    sessionStore.user = payload.user || null;
  } catch (error) {
    console.warn("读取小程序会话失败", error);
  }
}

function setSession(payload) {
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
    loginType: sessionStore.loginType,
    token: sessionStore.token,
    user: sessionStore.user,
  };
}

module.exports = {
  hydrateSession,
  setSession,
  clearSession,
  getSession,
};
