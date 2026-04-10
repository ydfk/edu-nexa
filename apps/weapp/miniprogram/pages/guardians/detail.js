const { getGuardians, saveGuardian, deleteGuardian } = require("../../services/guardians");
const { requireEditor } = require("../../utils/permission");
const Dialog = require("@vant/weapp/dialog/dialog").default;

Page({
  data: {
    isEdit: false,
    guardianId: "",
    name: "",
    phone: "",
    relationship: "",
    status: "active",
    password: "",
    remark: "",
    submitting: false,

    showRelPicker: false,
    relColumns: [
      { text: "父亲", value: "父亲" },
      { text: "母亲", value: "母亲" },
      { text: "祖父", value: "祖父" },
      { text: "祖母", value: "祖母" },
      { text: "其他", value: "其他" },
    ],
  },

  onLoad(options) {
    if (!requireEditor()) return;
    this.setData({ isEdit: !!options.id, guardianId: options.id || "" });
    if (options.id) this.loadGuardian(options.id);
  },

  async loadGuardian(id) {
    try {
      const res = await getGuardians({ id });
      const list = res.items || res || [];
      const guardian = Array.isArray(list) ? list.find((g) => String(g.id) === String(id)) : list;
      if (!guardian) return;
      this.setData({
        name: guardian.name || "",
        phone: guardian.phone || "",
        relationship: guardian.relationship || "",
        status: guardian.status || "active",
        remark: guardian.remark || "",
      });
    } catch (e) {
      console.warn("加载家长信息失败", e);
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onStatusChange(e) {
    this.setData({ status: e.detail });
  },

  openRelPicker() { this.setData({ showRelPicker: true }); },
  closeRelPicker() { this.setData({ showRelPicker: false }); },
  onRelConfirm(e) {
    const val = e.detail.value;
    this.setData({ relationship: val, showRelPicker: false });
  },

  async onSubmit() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: "请输入姓名", icon: "none" });
      return;
    }
    if (!this.data.phone.trim()) {
      wx.showToast({ title: "请输入手机号", icon: "none" });
      return;
    }
    if (!this.data.isEdit && !this.data.password) {
      wx.showToast({ title: "请输入密码", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      const payload = {
        name: this.data.name.trim(),
        phone: this.data.phone.trim(),
        relationship: this.data.relationship,
        status: this.data.status,
        remark: this.data.remark,
      };
      if (!this.data.isEdit) payload.password = this.data.password;
      if (this.data.isEdit) payload.id = this.data.guardianId;
      await saveGuardian(payload);
      wx.showToast({ title: "保存成功", icon: "success" });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
      wx.showToast({ title: e.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onResetPassword() {
    Dialog.confirm({ title: "重置密码", message: "确定要重置该家长的密码吗？" })
      .then(async () => {
        try {
          const { request } = require("../../services/request");
          await request({ method: "POST", url: `/guardian-profiles/${this.data.guardianId}/reset-password` });
          wx.showToast({ title: "密码已重置", icon: "success" });
        } catch (e) {
          wx.showToast({ title: "重置失败", icon: "none" });
        }
      })
      .catch(() => {});
  },

  onDelete() {
    Dialog.confirm({ title: "确认删除", message: "删除后不可恢复，确定要删除该家长吗？" })
      .then(async () => {
        try {
          await deleteGuardian(this.data.guardianId);
          wx.showToast({ title: "已删除", icon: "success" });
          setTimeout(() => wx.navigateBack(), 800);
        } catch (e) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      })
      .catch(() => {});
  },
});

