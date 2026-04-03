const { changePassword } = require("../../services/auth");
const { requireAuth } = require("../../utils/permission");

Page({
  data: {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    submitting: false,
  },

  onLoad() {
    requireAuth();
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  async onSubmit() {
    if (!this.data.currentPassword) {
      wx.showToast({ title: "请输入当前密码", icon: "none" });
      return;
    }
    if (!this.data.newPassword) {
      wx.showToast({ title: "请输入新密码", icon: "none" });
      return;
    }
    if (this.data.newPassword.length < 6) {
      wx.showToast({ title: "新密码至少6位", icon: "none" });
      return;
    }
    if (this.data.newPassword !== this.data.confirmPassword) {
      wx.showToast({ title: "两次密码不一致", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      await changePassword({
        currentPassword: this.data.currentPassword,
        newPassword: this.data.newPassword,
      });
      wx.showToast({ title: "修改成功", icon: "success" });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
      wx.showToast({ title: e.message || "修改失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
