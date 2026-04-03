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
      const params = {};
      if (this.data.keyword) params.keyword = this.data.keyword;
      const res = await getUsers(params);
      const list = (res.items || res || []).map((u) => ({
        ...u,
        statusText: getStatusName(u.status),
        tagType: getStatusTagType(u.status),
        roleNames: (u.roles || []).map((r) => getRoleName(r)),
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

