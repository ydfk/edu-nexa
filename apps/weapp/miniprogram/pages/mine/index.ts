const { getSession, isLoggedIn, clearSession, setActiveRole, getUserRoles, hasMultipleRoles } = require("../../store/session");
const { getRoleName } = require("../../utils/permission");
const Dialog = require("@vant/weapp/dialog/dialog");

Page({
  data: {
    loggedIn: false,
    displayName: "",
    phone: "",
    roleName: "",
    hasMultiRoles: false,
    roleList: [],
  },

  onShow() {
    const logged = isLoggedIn();
    if (!logged) {
      this.setData({ loggedIn: false });
      return;
    }
    const session = getSession();
    const roles = getUserRoles();
    this.setData({
      loggedIn: true,
      displayName: session.user?.displayName || "用户",
      phone: maskPhone(session.user?.phone || ""),
      roleName: getRoleName(session.activeRole),
      hasMultiRoles: hasMultipleRoles(),
      roleList: roles.map((r) => ({
        role: r,
        name: getRoleName(r),
        active: r === session.activeRole,
      })),
    });
  },

  goLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  switchRole(e) {
    const role = e.currentTarget.dataset.role;
    setActiveRole(role);
    this.onShow();
    wx.showToast({ title: `已切换为${getRoleName(role)}`, icon: "none" });
  },

  onLogout() {
    Dialog.confirm({ title: "确认退出", message: "退出后需要重新登录" })
      .then(() => {
        clearSession();
        this.onShow();
        wx.showToast({ title: "已退出登录", icon: "success" });
      })
      .catch(() => {});
  },
});

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.substring(0, 3) + "****" + phone.substring(7);
}
