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
    isLoggedIn: false,
    loginState: "",
    managementEntries: [],
    roleHintValue: "guardian",
    roleOptions,
    switchRoleOptions: [],
    userInfo: {
      name: "",
      phone: "",
      role: "",
      roleList: [],
    },
    wxCode: "",
  },
  onShow() {
    this.syncSessionState();
  },
  handleRoleHintChange(event) {
    this.setData({
      roleHintValue: event.detail.name,
    });
  },
  handleRoleHintTap(event) {
    this.setData({
      roleHintValue: event.currentTarget.dataset.role,
    });
  },
  handleWeChatLogin() {
    wx.login({
      success: (result) => {
        if (!result.code) {
          wx.showToast({
            title: "获取失败",
            icon: "none",
          });
          return;
        }

        this.setData({
          loginState: "已获取登录态",
          wxCode: result.code,
        });
      },
    });
  },
  handleGetPhoneNumber(event) {
    if (event.detail.errMsg !== "getPhoneNumber:ok") {
      wx.showToast({
        title: "未授权",
        icon: "none",
      });
      return;
    }

    if (!this.data.wxCode) {
      wx.showToast({
        title: "请先获取登录态",
        icon: "none",
      });
      return;
    }

    weappPhoneLogin({
      phoneCode: event.detail.code,
      roleHint: this.data.roleHintValue,
      wxCode: this.data.wxCode,
    })
      .then((payload) => {
        setSession({
          ...payload,
          activeRole: this.data.roleHintValue,
        });
        this.syncSessionState();
        wx.showToast({
          title: "成功",
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
  handleSwitchRoleChange(event) {
    setActiveRole(event.detail.name);
    this.syncSessionState();
  },
  handleLogout() {
    clearSession();
    this.setData({
      activeRole: "",
      boundStudents: [],
      canSwitchRole: false,
      isLoggedIn: false,
      loginState: "",
      managementEntries: [],
      switchRoleOptions: [],
      userInfo: {
        name: "",
        phone: "",
        role: "",
        roleList: [],
      },
      wxCode: "",
    });
  },
  syncSessionState() {
    const session = getSession();
    if (!session.token || !session.user) {
      this.setData({
        activeRole: "",
        boundStudents: [],
        canSwitchRole: false,
        isLoggedIn: false,
        loginState: "",
        managementEntries: [],
        switchRoleOptions: [],
        userInfo: {
          name: "",
          phone: "",
          role: "",
          roleList: [],
        },
      });
      return;
    }

    const roles = session.user.roles || [];
    const activeRole = session.activeRole || roles[0] || "";
    const activeRoleLabel = formatRoleLabel(activeRole);

    this.setData({
      activeRole,
      canSwitchRole: roles.length > 1,
      isLoggedIn: true,
      loginState: "已登录",
      managementEntries: buildManagementEntries(activeRole),
      switchRoleOptions: buildSwitchRoleOptions(roles),
      userInfo: {
        name: session.user.displayName || activeRoleLabel,
        phone: session.user.phone || "",
        role: activeRoleLabel,
        roleList: roles.map(formatRoleLabel),
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
  handleOpenEntry(event) {
    const entry = event.currentTarget.dataset.entry;
    if (entry === "students") {
      this.openStudentManagement();
      return;
    }
    if (entry === "calendar") {
      this.openServiceCalendar();
    }
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

function buildManagementEntries(activeRole) {
  const entries = [];
  if (activeRole === "teacher" || activeRole === "admin") {
    entries.push({
      action: "students",
      title: "学生",
      value: "",
    });
  }
  if (activeRole === "admin") {
    entries.push({
      action: "calendar",
      title: "服务日历",
      value: "",
    });
  }
  return entries;
}
