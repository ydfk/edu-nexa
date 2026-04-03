const { weappPhoneLogin } = require("../../services/auth");
const { setSession } = require("../../store/session");

Page({
  data: {
    step: "role",
    selectedRole: "",
    agreedPrivacy: false,
  },

  selectRole(e) {
    this.setData({ selectedRole: e.currentTarget.dataset.role });
  },

  onPrivacyChange(e) {
    this.setData({ agreedPrivacy: e.detail });
  },

  togglePrivacy() {
    this.setData({ agreedPrivacy: !this.data.agreedPrivacy });
  },

  goPrivacy() {
    wx.navigateTo({ url: "/pages/settings/about" });
  },

  async onGetPhoneNumber(e) {
    if (e.detail.errMsg !== "getPhoneNumber:ok") {
      wx.showToast({ title: "已取消授权", icon: "none" });
      return;
    }

    this.setData({ step: "loading" });

    try {
      const loginRes = await wx.login();
      const wxCode = loginRes.code;
      const phoneCode = e.detail.code;

      const result = await weappPhoneLogin({
        wxCode,
        phoneCode,
        roleHint: this.data.selectedRole,
      });

      setSession({
        token: result.token,
        user: result.user,
        loginType: result.loginType,
      });

      wx.switchTab({ url: "/pages/home/index" });
    } catch (err) {
      console.error("登录失败", err);
      wx.showToast({ title: err.message || "登录失败", icon: "none" });
      this.setData({ step: "role" });
    }
  },
});
