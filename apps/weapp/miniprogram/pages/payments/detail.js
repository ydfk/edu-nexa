const { getPaymentRecords, savePaymentRecord, deletePaymentRecord } = require("../../services/payments");
const { getStudents } = require("../../services/records");
const { getRuntimeSettings } = require("../../services/common");
const { getSession, isGuardian } = require("../../store/session");
const { requireEditor } = require("../../utils/permission");
const { getToday, formatDate } = require("../../utils/date");
const Dialog = require("@vant/weapp/dialog/dialog");

Page({
  data: {
    isEdit: false,
    paymentId: "",
    paidAt: "",
    paymentType: "",
    paymentAmount: "",
    periodStartDate: "",
    periodEndDate: "",
    remark: "",
    refundAmount: "",
    refundRemark: "",
    originalStatus: "",
    submitting: false,

    selectedStudent: {},
    students: [],
    studentColumns: [],
    typeColumns: [],

    showStudentPicker: false,
    showTypePicker: false,
    showPaidAtPicker: false,
    showStartDatePicker: false,
    showEndDatePicker: false,
  },

  onLoad(options) {
    if (!requireEditor()) return;
    this.setData({
      isEdit: !!options.id,
      paymentId: options.id || "",
      paidAt: getToday(),
    });
    this.loadStudents();
    this.loadSettings();
    if (options.id) this.loadPayment(options.id);
  },

  async loadStudents() {
    try {
      const params = {};
      if (isGuardian()) {
        const s = getSession();
        params.guardianPhone = s.user?.phone;
      }
      params.status = "active";
      const res = await getStudents(params);
      const list = res.items || res || [];
      this.setData({
        students: list,
        studentColumns: list.map((s) => ({ text: buildStudentLabel(s), value: s.id })),
      });
    } catch (e) {
      console.warn("加载学生失败", e);
    }
  },

  async loadSettings() {
    try {
      const settings = await getRuntimeSettings();
      const types = settings.paymentTypes || [];
      this.setData({
        typeColumns: types.map((t) => typeof t === "string" ? { text: t, value: t } : { text: t.name || t.label, value: t.name || t.value }),
      });
    } catch (e) {
      console.warn("加载设置失败", e);
    }
  },

  async loadPayment(id) {
    try {
      const res = await getPaymentRecords({ id });
      const list = res.items || res || [];
      const record = Array.isArray(list) ? list.find((p) => String(p.id) === String(id)) : list;
      if (!record) return;
      this.setData({
        paidAt: record.paidAt || "",
        paymentType: record.paymentType || "",
        paymentAmount: record.paymentAmount ? String(record.paymentAmount) : "",
        periodStartDate: record.periodStartDate || "",
        periodEndDate: record.periodEndDate || "",
        remark: record.remark || "",
        originalStatus: record.status || "",
        refundAmount: record.refundAmount ? String(record.refundAmount) : "",
        refundRemark: record.refundRemark || "",
        selectedStudent: { id: record.studentId, name: buildRecordStudentLabel(record) },
      });
    } catch (e) {
      console.warn("加载缴费记录失败", e);
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  openStudentPicker() { this.setData({ showStudentPicker: true }); },
  closeStudentPicker() { this.setData({ showStudentPicker: false }); },
  onStudentConfirm(e) {
    const val = e.detail.value;
    const student = this.data.students.find((s) => s.id === val);
    if (student) {
      this.setData({ selectedStudent: { id: student.id, name: buildStudentLabel(student) } });
    }
    this.closeStudentPicker();
  },

  openTypePicker() { this.setData({ showTypePicker: true }); },
  closeTypePicker() { this.setData({ showTypePicker: false }); },
  onTypeConfirm(e) {
    this.setData({ paymentType: e.detail.value, showTypePicker: false });
  },

  openPaidAtPicker() { this.setData({ showPaidAtPicker: true }); },
  closePaidAtPicker() { this.setData({ showPaidAtPicker: false }); },
  onPaidAtConfirm(e) {
    this.setData({ showPaidAtPicker: false, paidAt: formatDate(new Date(e.detail)) });
  },

  openStartDatePicker() { this.setData({ showStartDatePicker: true }); },
  closeStartDatePicker() { this.setData({ showStartDatePicker: false }); },
  onStartDateConfirm(e) {
    this.setData({ showStartDatePicker: false, periodStartDate: formatDate(new Date(e.detail)) });
  },

  openEndDatePicker() { this.setData({ showEndDatePicker: true }); },
  closeEndDatePicker() { this.setData({ showEndDatePicker: false }); },
  onEndDateConfirm(e) {
    this.setData({ showEndDatePicker: false, periodEndDate: formatDate(new Date(e.detail)) });
  },

  async onSubmit() {
    if (!this.data.selectedStudent.id) {
      wx.showToast({ title: "请选择学生", icon: "none" });
      return;
    }
    if (!this.data.paymentType) {
      wx.showToast({ title: "请选择缴费类型", icon: "none" });
      return;
    }
    if (!this.data.paymentAmount) {
      wx.showToast({ title: "请输入缴费金额", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      const payload = {
        studentId: this.data.selectedStudent.id,
        paidAt: this.data.paidAt,
        paymentType: this.data.paymentType,
        paymentAmount: parseFloat(this.data.paymentAmount),
        periodStartDate: this.data.periodStartDate,
        periodEndDate: this.data.periodEndDate,
        remark: this.data.remark,
      };
      if (this.data.refundAmount) {
        payload.refundAmount = parseFloat(this.data.refundAmount);
        payload.refundRemark = this.data.refundRemark;
      }
      if (this.data.isEdit) payload.id = this.data.paymentId;
      await savePaymentRecord(payload);
      wx.showToast({ title: "保存成功", icon: "success" });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
      wx.showToast({ title: e.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onDelete() {
    Dialog.confirm({ title: "确认删除", message: "删除后不可恢复" })
      .then(async () => {
        try {
          await deletePaymentRecord(this.data.paymentId);
          wx.showToast({ title: "已删除", icon: "success" });
          setTimeout(() => wx.navigateBack(), 800);
        } catch (e) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      })
      .catch(() => {});
  },
});

function buildStudentLabel(student) {
  const gradeName = student.gradeName || student.grade || "";
  const className = student.className || "";
  const suffix = [gradeName, className].filter(Boolean).join(" ");
  return suffix ? `${student.name}（${suffix}）` : student.name;
}

function buildRecordStudentLabel(record) {
  const gradeName = record.gradeName || record.grade || "";
  const className = record.className || "";
  const suffix = [gradeName, className].filter(Boolean).join(" ");
  return suffix ? `${record.studentName}（${suffix}）` : record.studentName;
}

