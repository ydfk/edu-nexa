const { login } = require("../../services/auth");
const { isLoggedIn, setSession } = require("../../store/session");

Page({
  data: {
    phone: "",
    password: "",
    agreedPrivacy: false,
    submitting: false,
  },

  onShow() {
    if (isLoggedIn()) {
      wx.switchTab({ url: "/pages/home/index" });
    }
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
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

  async onPasswordLogin() {
    const phone = (this.data.phone || "").trim();
    const password = (this.data.password || "").trim();

    if (!this.data.agreedPrivacy) {
      wx.showToast({ title: "请先同意隐私协议", icon: "none" });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: "请输入正确手机号", icon: "none" });
      return;
    }
    if (!password) {
      wx.showToast({ title: "请输入密码", icon: "none" });
      return;
    }

    this.setData({ submitting: true });

    try {
      const result = await login({ phone, password });
      this.finishLogin(result);
    } catch (err) {
      console.error("密码登录失败", err);
      wx.showToast({ title: err.message || "登录失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },

  finishLogin(result) {
    setSession({
      token: result.token,
      user: result.user,
      loginType: result.loginType,
    });
    wx.switchTab({ url: "/pages/home/index" });
  },
});
