const { getGuardians } = require("../../services/guardians");
const { isLoggedIn, canEdit } = require("../../store/session");
const { requireAuth, getStatusName, getStatusTagType } = require("../../utils/permission");

Page({
  data: {
    keyword: "",
    guardians: [],
    canEdit: false,
  },

  onShow() {
    if (!requireAuth()) return;
    this.setData({ canEdit: canEdit() });
    this.loadGuardians();
  },

  onPullDownRefresh() {
    this.loadGuardians().finally(() => wx.stopPullDownRefresh());
  },

  onSearchChange(e) {
    this.setData({ keyword: e.detail });
  },

  onSearch() {
    this.loadGuardians();
  },

  async loadGuardians() {
    try {
      const params = {};
      if (this.data.keyword) params.keyword = this.data.keyword;
      const res = await getGuardians(params);
      const list = (res.items || res || []).map((g) => ({
        ...g,
        statusText: getStatusName(g.status),
        tagType: getStatusTagType(g.status),
      }));
      this.setData({ guardians: list });
    } catch (e) {
      console.warn("加载家长列表失败", e);
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/guardians/detail?id=${id}` });
  },

  onAdd() {
    wx.navigateTo({ url: "/pages/guardians/detail" });
  },
});

