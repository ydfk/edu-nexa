const { weappPhoneLogin } = require("../../services/auth");
const { getStudents } = require("../../services/records");
const {
  clearSession,
  getSession,
  setActiveRole,
  setSession,
} = require("../../store/session");

const roleOptions = [
  { label: "管理员", value: "admin" },
  { label: "监护人", value: "guardian" },
  { label: "教师", value: "teacher" },
];

Page({
  data: {
    activeRole: "",
    boundStudents: [],
    canSwitchRole: false,
    canManageServiceCalendar: false,
    canManageStudents: false,
    loginState: "未登录",
    roleHintIndex: 0,
    roleOptions,
    switchRoleOptions: [],
    shortcuts: ["切换当前角色", "查看绑定学生", "确认服务有效期", "查看登录设置"],
    userInfo: {
      campusName: "微信手机号登录",
      name: "未登录",
      phone: "未绑定",
      role: "请先完成登录",
    },
    wxCode: "",
  },
  onShow() {
    this.syncSessionState();
  },
  handleRoleHintChange(event) {
    this.setData({
      roleHintIndex: Number(event.detail.value),
    });
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

    const roleHint = this.data.roleOptions[this.data.roleHintIndex].value;

    weappPhoneLogin({
      phoneCode: event.detail.code,
      roleHint,
      wxCode: this.data.wxCode,
    })
      .then((payload) => {
        setSession({
          ...payload,
          activeRole: roleHint,
        });
        this.syncSessionState();
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
  handleSwitchRole(event) {
    const role = event.currentTarget.dataset.role;
    setActiveRole(role);
    this.syncSessionState();
  },
  handleLogout() {
    clearSession();
    this.setData({
      activeRole: "",
      boundStudents: [],
      canManageServiceCalendar: false,
      canManageStudents: false,
      canSwitchRole: false,
      loginState: "未登录",
      userInfo: {
        campusName: "微信手机号登录",
        name: "未登录",
        phone: "未绑定",
        role: "请先完成登录",
      },
      switchRoleOptions: [],
      wxCode: "",
    });
  },
  syncSessionState() {
    const session = getSession();
    if (!session.token || !session.user) {
      this.setData({
        activeRole: "",
        boundStudents: [],
        canManageServiceCalendar: false,
        canManageStudents: false,
        canSwitchRole: false,
        loginState: "未登录",
        switchRoleOptions: [],
        userInfo: {
          campusName: "微信手机号登录",
          name: "未登录",
          phone: "未绑定",
          role: "请先完成登录",
        },
      });
      return;
    }

    const activeRole = session.activeRole || (session.user.roles || [])[0] || "";
    const activeRoleLabel = formatRoleLabel(activeRole);

    this.setData({
      activeRole,
      canManageServiceCalendar: activeRole === "admin",
      canManageStudents: activeRole === "teacher" || activeRole === "admin",
      loginState: "已登录",
      canSwitchRole: Array.isArray(session.user.roles) && session.user.roles.length > 1,
      switchRoleOptions: buildSwitchRoleOptions(session.user.roles || []),
      userInfo: {
        campusName: "微信手机号会话",
        name: session.user.displayName || activeRoleLabel,
        phone: session.user.phone || "未绑定",
        role: `当前角色：${activeRoleLabel}；已开通：${(session.user.roles || [])
          .map(formatRoleLabel)
          .join(" / ")}`,
      },
    });

    getStudents({ guardianPhone: session.user.phone }).then((students) => {
      this.setData({
        boundStudents: students,
      });
    });
  },
  openStudentManagement() {
    wx.navigateTo({
      url: "/pages/student-management/index",
    });
  },
  openServiceCalendar() {
    wx.navigateTo({
      url: "/pages/service-calendar/index",
    });
  },
});

function formatRoleLabel(role) {
  switch (role) {
    case "teacher":
      return "教师";
    case "guardian":
      return "监护人";
    case "admin":
      return "管理员";
    default:
      return role || "未分配";
  }
}

function buildSwitchRoleOptions(roles) {
  return roleOptions.filter((item) => roles.includes(item.value));
}
