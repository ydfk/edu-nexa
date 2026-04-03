const { getUsers, saveUser, deleteUser, resetUserPassword } = require("../../services/teachers");
const { requireAdmin } = require("../../utils/permission");
const Dialog = require("@vant/weapp/dialog/dialog");

Page({
  data: {
    isEdit: false,
    userId: "",
    displayName: "",
    phone: "",
    role: "teacher",
    status: "active",
    password: "",
    submitting: false,
  },

  onLoad(options) {
    if (!requireAdmin()) return;
    this.setData({ isEdit: !!options.id, userId: options.id || "" });
    if (options.id) this.loadUser(options.id);
  },

  async loadUser(id) {
    try {
      const res = await getUsers({ id });
      const list = res.items || res || [];
      const user = Array.isArray(list) ? list.find((u) => String(u.id) === String(id)) : list;
      if (!user) return;
      this.setData({
        displayName: user.displayName || "",
        phone: user.phone || "",
        role: (user.roles || [])[0] || "teacher",
        status: user.status || "active",
      });
    } catch (e) {
      console.warn("加载教师信息失败", e);
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onRoleChange(e) {
    this.setData({ role: e.detail });
  },

  onStatusChange(e) {
    this.setData({ status: e.detail });
  },

  async onSubmit() {
    if (!this.data.displayName.trim()) {
      wx.showToast({ title: "请输入姓名", icon: "none" });
      return;
    }
    if (!this.data.phone.trim()) {
      wx.showToast({ title: "请输入手机号", icon: "none" });
      return;
    }
    if (!this.data.isEdit && !this.data.password) {
      wx.showToast({ title: "请设置初始密码", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      const payload: Record<string, any> = {
        displayName: this.data.displayName.trim(),
        phone: this.data.phone.trim(),
        roles: [this.data.role],
        status: this.data.status,
      };
      if (!this.data.isEdit) payload.password = this.data.password;
      if (this.data.isEdit) payload.id = this.data.userId;
      await saveUser(payload);
      wx.showToast({ title: "保存成功", icon: "success" });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
      wx.showToast({ title: e.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onResetPassword() {
    Dialog.confirm({ title: "重置密码", message: "确定要重置该教师的密码吗？" })
      .then(async () => {
        try {
          await resetUserPassword(this.data.userId);
          wx.showToast({ title: "密码已重置", icon: "success" });
        } catch (e) {
          wx.showToast({ title: "重置失败", icon: "none" });
        }
      })
      .catch(() => {});
  },

  onDelete() {
    Dialog.confirm({ title: "确认删除", message: "删除后不可恢复，确定要删除该教师吗？" })
      .then(async () => {
        try {
          await deleteUser(this.data.userId);
          wx.showToast({ title: "已删除", icon: "success" });
          setTimeout(() => wx.navigateBack(), 800);
        } catch (e) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      })
      .catch(() => {});
  },
});
