const { getStudents, saveMealRecord, getMealRecords, uploadImage } = require("../../services/records");
const { getSession, isGuardian } = require("../../store/session");
const { requireEditor } = require("../../utils/permission");
const { getToday, formatDate } = require("../../utils/date");
const Dialog = require("@vant/weapp/dialog/dialog");

Page({
  data: {
    isEdit: false,
    recordId: "",
    serviceDate: "",
    status: "completed",
    remark: "",
    fileList: [],
    imageUrls: [],
    selectedStudent: {},
    showStudentPicker: false,
    showDatePicker: false,
    studentColumns: [],
    students: [],
    submitting: false,
  },

  onLoad(options) {
    this.setData({
      serviceDate: options.date || getToday(),
      isEdit: !!options.id,
      recordId: options.id || "",
    });
    this.loadStudents();
    if (options.id) this.loadRecord(options.id);
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
        studentColumns: list.map((s) => ({ text: `${s.name}（${s.className || ""})`, value: s.id })),
      });
    } catch (e) {
      console.warn("加载学生失败", e);
    }
  },

  async loadRecord(id) {
    try {
      const res = await getMealRecords({ id });
      const records = res.items || res || [];
      const record = Array.isArray(records) ? records.find((r) => String(r.id) === String(id)) : records;
      if (!record) return;

      const student = this.data.students.find((s) => String(s.id) === String(record.studentId)) || {};
      this.setData({
        status: record.status || "completed",
        remark: record.remark || "",
        serviceDate: record.serviceDate || getToday(),
        selectedStudent: { id: record.studentId, name: record.studentName || student.name },
        imageUrls: record.imageUrls || [],
        fileList: (record.imageUrls || []).map((url, i) => ({ url, name: `img${i}` })),
      });
    } catch (e) {
      console.warn("加载记录失败", e);
    }
  },

  openStudentPicker() { this.setData({ showStudentPicker: true }); },
  closeStudentPicker() { this.setData({ showStudentPicker: false }); },

  onStudentConfirm(e) {
    const val = e.detail.value;
    const student = this.data.students.find((s) => s.id === val);
    if (student) {
      this.setData({ selectedStudent: { id: student.id, name: student.name } });
    }
    this.closeStudentPicker();
  },

  openDatePicker() { this.setData({ showDatePicker: true }); },
  closeDatePicker() { this.setData({ showDatePicker: false }); },

  onDateConfirm(e) {
    this.setData({ showDatePicker: false, serviceDate: formatDate(new Date(e.detail)) });
  },

  onStatusChange(e) { this.setData({ status: e.detail }); },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }); },

  async afterRead(e) {
    const { file } = e.detail;
    const files = Array.isArray(file) ? file : [file];
    for (const f of files) {
      try {
        wx.showLoading({ title: "上传中..." });
        const res = await uploadImage({ filePath: f.url || f.path });
        const urls = [...this.data.imageUrls, res.url || res];
        const fl = [...this.data.fileList, { url: res.url || res, name: `img${urls.length}` }];
        this.setData({ imageUrls: urls, fileList: fl });
      } catch (err) {
        wx.showToast({ title: "上传失败", icon: "none" });
      } finally {
        wx.hideLoading();
      }
    }
  },

  onDeleteImage(e) {
    const idx = e.detail.index;
    const urls = [...this.data.imageUrls];
    const fl = [...this.data.fileList];
    urls.splice(idx, 1);
    fl.splice(idx, 1);
    this.setData({ imageUrls: urls, fileList: fl });
  },

  async onSubmit() {
    if (!this.data.selectedStudent.id) {
      wx.showToast({ title: "请选择学生", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      const payload = {
        studentId: this.data.selectedStudent.id,
        serviceDate: this.data.serviceDate,
        status: this.data.status,
        remark: this.data.remark,
        imageUrls: this.data.imageUrls,
      };
      if (this.data.isEdit) payload.id = this.data.recordId;
      await saveMealRecord(payload);
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
          const { request } = require("../../services/request");
          await request({ method: "DELETE", url: `/meal-records/${this.data.recordId}` });
          wx.showToast({ title: "已删除", icon: "success" });
          setTimeout(() => wx.navigateBack(), 800);
        } catch (e) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      })
      .catch(() => {});
  },
});

