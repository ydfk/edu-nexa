Page({
  data: {
    loggedIn: false,
    features: [
      { id: "about", title: "使用说明", icon: "description", url: "/pages/settings/about" },
      { id: "privacy", title: "隐私说明", icon: "shield-o", url: "/pages/settings/about" },
    ],
    quickActions: [],
  },

  onShow() {
    this.setData({ loggedIn: false });
  },

  goFeature(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  },

  onQuickActionTap() {
    wx.showToast({ title: "当前暂无更多功能", icon: "none" });
  },
});
