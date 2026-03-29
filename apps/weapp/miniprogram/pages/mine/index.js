const { weappPhoneLogin } = require("../../services/auth");
const { getSession, setSession } = require("../../store/session");

Page({
  data: {
    loginState: "未登录",
    shortcuts: ["切换校区", "登录设置", "反馈模板", "操作说明"],
    userInfo: {
      campusName: "南湖校区",
      name: "微信手机号登录",
      phone: "未绑定",
      role: "监护人默认登录，可按账号关系扩展角色",
    },
    wxCode: "",
  },
  onShow() {
    this.syncSessionState();
  },
  handleWeChatLogin() {
    wx.login({
      success: (result) => {
        if (!result.code) {
          wx.showToast({
            title: "未获取到微信登录态",
            icon: "none",
          });
          return;
        }

        this.setData({
          loginState: "已获取微信登录态",
          wxCode: result.code,
        });
      },
    });
  },
  handleGetPhoneNumber(event) {
    if (event.detail.errMsg !== "getPhoneNumber:ok") {
      wx.showToast({
        title: "用户未授权手机号",
        icon: "none",
      });
      return;
    }

    if (!this.data.wxCode) {
      wx.showToast({
        title: "请先获取微信登录态",
        icon: "none",
      });
      return;
    }

    weappPhoneLogin({
      phoneCode: event.detail.code,
      roleHint: "guardian",
      wxCode: this.data.wxCode,
    })
      .then((payload) => {
        setSession(payload);
        this.setData({
          loginState: "已登录",
          userInfo: {
            campusName: "微信手机号会话",
            name: payload.user.displayName || "监护人",
            phone: payload.user.phone || "未绑定",
            role: (payload.user.roles || []).join(" / ") || "guardian",
          },
        });
        wx.showToast({
          title: "登录成功",
          icon: "success",
        });
      })
      .catch((error) => {
        wx.showToast({
          title: error.message || "登录失败",
          icon: "none",
        });
      });
  },
  syncSessionState() {
    const session = getSession();
    if (!session.token || !session.user) {
      return;
    }

    this.setData({
      loginState: "已登录",
      userInfo: {
        campusName: "微信手机号会话",
        name: session.user.displayName || "监护人",
        phone: session.user.phone || "未绑定",
        role: (session.user.roles || []).join(" / ") || "guardian",
      },
    });
  },
});
