const { getStudents } = require("../../services/records");
const { getSession, isLoggedIn, isGuardian, canEdit } = require("../../store/session");
const { requireAuth, getStatusName, getStatusTagType } = require("../../utils/permission");

Page({
  data: {
    keyword: "",
    students: [],
    canEdit: false,
  },

  onShow() {
    if (!requireAuth()) return;
    this.setData({ canEdit: canEdit() });
    this.loadStudents();
  },

  onPullDownRefresh() {
    this.loadStudents().finally(() => wx.stopPullDownRefresh());
  },

  onSearchChange(e) {
    this.setData({ keyword: e.detail });
  },

  onSearch() {
    this.loadStudents();
  },

  async loadStudents() {
    try {
      const params = {};
      if (this.data.keyword) params.keyword = this.data.keyword;
      if (isGuardian()) {
        const session = getSession();
        params.guardianPhone = session.user?.phone;
      }
      const res = await getStudents(params);
      const list = (res.items || res || []).map((s) => ({
        ...s,
        statusText: getStatusName(s.status),
        tagType: getStatusTagType(s.status),
      }));
      this.setData({ students: list });
    } catch (e) {
      console.warn("加载学生列表失败", e);
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/students/detail?id=${id}` });
  },

  onAdd() {
    wx.navigateTo({ url: "/pages/students/detail" });
  },
});

