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
    this.setData({ features });

    const quickActions = [];
    if (canEdit()) {
      quickActions.push(
        { id: "add-meal", title: "记录用餐", desc: "快速记录学生用餐情况", url: "/pages/meal-record/edit" },
        { id: "add-hw", title: "记录作业", desc: "记录学生作业完成情况", url: "/pages/homework-record/edit" },
      );
    }
    this.setData({ quickActions });
  },

  goLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  goFeature(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url });
  },
});
