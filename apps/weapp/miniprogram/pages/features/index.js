const { isLoggedIn, canEdit } = require("../../store/session");
const { getFeatureEntries } = require("../../utils/permission");

Page({
  data: {
    loggedIn: false,
    features: [],
    quickActions: [],
  },

  onShow() {
    const logged = isLoggedIn();
    this.setData({ loggedIn: logged });
    if (!logged) return;

    const features = getFeatureEntries();
    const quickActions = buildQuickActions(logged, canEdit());
    this.setData({ features, quickActions });
  },

  goLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  goFeature(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  },

  onQuickActionTap(e) {
    const action = e.currentTarget.dataset.action || "";
    if (action === "print-homework") {
      wx.navigateTo({ url: "/pages/daily-homework/index?entry=print" });
      return;
    }
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.navigateTo({ url });
    }
  },
});

function buildQuickActions(loggedIn, editable) {
  if (!loggedIn || !editable) {
    return [];
  }

  return [
    { id: "publish-homework", title: "发布作业", desc: "快速进入每日作业页面", url: "/pages/daily-homework/index" },
    { id: "print-homework", title: "打印作业", desc: "打开作业页面中的打印入口", action: "print-homework" },
  ];
}
