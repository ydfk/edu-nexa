const { getSession, isLoggedIn, clearSession } = require("../../store/session");
const { getRoleName } = require("../../utils/permission");
const Dialog = require("@vant/weapp/dialog/dialog").default;

Page({
  data: {
    loggedIn: false,
    displayName: "",
    phone: "",
    roleName: "",
  },

  onShow() {
    const logged = isLoggedIn();
    if (!logged) {
      this.setData({ loggedIn: false });
      return;
    }
    const session = getSession();
    this.setData({
      loggedIn: true,
      displayName: session.user?.displayName || "用户",
      phone: maskPhone(session.user?.phone || ""),
      roleName: getRoleName(session.activeRole),
    });
  },

  goLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  onLogout() {
    Dialog.confirm({ title: "确认退出", message: "退出后需要重新登录" })
      .then(() => {
        clearSession();
        this.setData({
          loggedIn: false,
          displayName: "",
          phone: "",
          roleName: "",
        });
        wx.switchTab({
          url: "/pages/home/index",
          fail: () => {
            wx.reLaunch({ url: "/pages/home/index" });
          },
        });
      })
      .catch(() => {});
  },
});

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.substring(0, 3) + "****" + phone.substring(7);
}
