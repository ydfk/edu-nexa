const { isLoggedIn, canEdit } = require("../../store/session");
const { getFeatureEntries, getAllFeatureEntries } = require("../../utils/permission");

Page({
  data: {
    loggedIn: false,
    features: [],
    quickActions: [],
  },

  onShow() {
    const logged = isLoggedIn();
    const features = logged ? getFeatureEntries() : getAllFeatureEntries();
    const quickActions = buildQuickActions(logged, canEdit());
    this.setData({ loggedIn: logged, features, quickActions });
  },

  goLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  goFeature(e) {
    if (!this.data.loggedIn) {
      wx.showToast({ title: "请先登录", icon: "none" });
      setTimeout(() => {
        wx.navigateTo({ url: "/pages/login/index" });
      }, 200);
      return;
    }
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  },

  onQuickActionTap(e) {
    if (!this.data.loggedIn) {
      wx.showToast({ title: "请先登录", icon: "none" });
      setTimeout(() => {
        wx.navigateTo({ url: "/pages/login/index" });
      }, 200);
      return;
    }
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
  if (!loggedIn) {
    return [
      { id: "publish-homework", title: "发布作业", desc: "登录后快速进入每日作业页面", url: "/pages/daily-homework/index" },
      { id: "print-homework", title: "打印作业", desc: "登录后生成并预览当日作业 PDF", action: "print-homework" },
    ];
  }

  if (!editable) {
    return [];
  }

  return [
    { id: "publish-homework", title: "发布作业", desc: "快速进入每日作业页面", url: "/pages/daily-homework/index" },
    { id: "print-homework", title: "打印作业", desc: "打开作业页面中的打印入口", action: "print-homework" },
  ];
}
