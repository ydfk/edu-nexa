const { getProfile, updateProfile } = require("../../services/auth");
const { getSession } = require("../../store/session");
const { requireAuth, getRoleName } = require("../../utils/permission");

Page({
  data: {
    phone: "",
    roleName: "",
    displayName: "",
    submitting: false,
  },

  onShow() {
    if (!requireAuth()) return;
    this.loadProfile();
  },

  async loadProfile() {
    try {
      const session = getSession();
      this.setData({
        phone: session.user?.phone || "",
        roleName: getRoleName(session.activeRole),
      });

      const profile = await getProfile();
      this.setData({
        displayName: profile.displayName || "",
        phone: profile.phone || session.user?.phone || "",
      });
    } catch (e) {
      console.warn("加载个人信息失败", e);
    }
  },

  onNameInput(e) {
    this.setData({ displayName: e.detail.value });
  },

  async onSave() {
    if (!this.data.displayName.trim()) {
      wx.showToast({ title: "请输入显示名称", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      await updateProfile({ displayName: this.data.displayName.trim() });
      wx.showToast({ title: "保存成功", icon: "success" });
    } catch (e) {
      wx.showToast({ title: e.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
