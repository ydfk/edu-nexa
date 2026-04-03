const { getPaymentRecords } = require("../../services/payments");
const { getSession, isLoggedIn, isGuardian, canEdit } = require("../../store/session");
const { requireAuth, getStatusName, getStatusTagType } = require("../../utils/permission");

Page({
  data: {
    keyword: "",
    statusFilter: "",
    payments: [],
    canEdit: false,
    statusOptions: [
      { text: "全部状态", value: "" },
      { text: "已缴费", value: "paid" },
      { text: "部分退款", value: "partial_refunded" },
      { text: "已退款", value: "refunded" },
    ],
  },

  onShow() {
    if (!requireAuth()) return;
    this.setData({ canEdit: canEdit() });
    this.loadPayments();
  },

  onPullDownRefresh() {
    this.loadPayments().finally(() => wx.stopPullDownRefresh());
  },

  onSearchChange(e) {
    this.setData({ keyword: e.detail });
  },

  onSearch() {
    this.loadPayments();
  },

  onStatusChange(e) {
    this.setData({ statusFilter: e.detail });
    this.loadPayments();
  },

  async loadPayments() {
    try {
      const params = {};
      if (this.data.keyword) params.keyword = this.data.keyword;
      if (this.data.statusFilter) params.status = this.data.statusFilter;
      if (isGuardian()) {
        const session = getSession();
        params.guardianPhone = session.user?.phone;
      }
      const res = await getPaymentRecords(params);
      const list = (res.items || res || []).map((p) => ({
        ...p,
        statusText: getStatusName(p.status),
        tagType: getStatusTagType(p.status),
      }));
      this.setData({ payments: list });
    } catch (e) {
      console.warn("加载缴费记录失败", e);
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/payments/detail?id=${id}` });
  },

  onAdd() {
    wx.navigateTo({ url: "/pages/payments/detail" });
  },
});

