const { getUsers } = require("../../services/teachers");
const { isLoggedIn, isAdmin } = require("../../store/session");
const { requireAuth, getStatusName, getStatusTagType, getRoleName } = require("../../utils/permission");

Page({
  data: {
    keyword: "",
    users: [],
    isAdmin: false,
  },

  onShow() {
    if (!requireAuth()) return;
    this.setData({ isAdmin: isAdmin() });
    this.loadUsers();
  },

  onPullDownRefresh() {
    this.loadUsers().finally(() => wx.stopPullDownRefresh());
  },

  onSearchChange(e) {
    this.setData({ keyword: e.detail });
  },

  onSearch() {
    this.loadUsers();
  },

  async loadUsers() {
    try {
      const params = { role: "teacher" };
      const res = await getUsers(params);
      const keyword = (this.data.keyword || "").trim();
      const list = (res.items || res || [])
        .filter((u) => Array.isArray(u.roles) && u.roles.includes("teacher"))
        .filter((u) => {
          if (!keyword) return true;
          const name = u.displayName || "";
          const phone = u.phone || "";
          return name.includes(keyword) || phone.includes(keyword);
        })
        .map((u) => ({
        ...u,
        statusText: getStatusName(u.status),
        tagType: getStatusTagType(u.status),
        roleNames: (u.roles || []).filter((r) => r !== "guardian").map((r) => getRoleName(r)),
      }));
      this.setData({ users: list });
    } catch (e) {
      console.warn("加载教师列表失败", e);
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/teachers/detail?id=${id}` });
  },

  onAdd() {
    wx.navigateTo({ url: "/pages/teachers/detail" });
  },
});

