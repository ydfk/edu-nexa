const { getProfile } = require("../../services/auth");
const { getSession, isLoggedIn, clearSession } = require("../../store/session");
const { getRoleName, requireAuth } = require("../../utils/permission");
const Dialog = require("@vant/weapp/dialog/dialog").default;

Page({
  data: {
    loggedIn: false,
    displayName: "",
    phone: "",
    roleName: "",
    headerName: "未登录",
    avatarIcon: "user-o",
    avatarColor: "#7f8d86",
  },

  onShow() {
    if (!isLoggedIn()) {
      this.setData({
        loggedIn: false,
        displayName: "",
        phone: "",
        roleName: "",
        headerName: "未登录",
        avatarIcon: "user-o",
        avatarColor: "#7f8d86",
      });
      return;
    }

    this.loadProfile();
  },

  async loadProfile() {
    const session = getSession();
    const fallbackDisplayName = session.user?.displayName || session.user?.name || "用户";
    const fallbackPhone = session.user?.phone || "";
    const roleName = getRoleName(session.activeRole);

    this.setData({
      loggedIn: true,
      displayName: fallbackDisplayName,
      phone: maskPhone(fallbackPhone),
      roleName,
      headerName: fallbackDisplayName,
      avatarIcon: "contact",
      avatarColor: "#07C160",
    });

    try {
      const profile = await getProfile();
      const displayName = profile.displayName || fallbackDisplayName;
      const phone = profile.phone || fallbackPhone;

      this.setData({
        loggedIn: true,
        displayName,
        phone: maskPhone(phone),
        roleName,
        headerName: displayName,
        avatarIcon: "contact",
        avatarColor: "#07C160",
      });
    } catch (error) {
      console.warn("加载个人信息失败", error);
    }
  },

  goLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  goProfile() {
    if (!requireAuth()) return;
    wx.navigateTo({ url: "/pages/settings/profile" });
  },

  goPassword() {
    if (!requireAuth()) return;
    wx.navigateTo({ url: "/pages/settings/password" });
  },

  goAbout() {
    wx.navigateTo({ url: "/pages/settings/about" });
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
          headerName: "未登录",
          avatarIcon: "user-o",
          avatarColor: "#7f8d86",
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
  return `${phone.substring(0, 3)}****${phone.substring(7)}`;
}
