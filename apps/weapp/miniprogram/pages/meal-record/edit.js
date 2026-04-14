const {
  getMealRecords,
  getStudents,
  saveMealRecord,
  uploadAttachment,
  resolveUploadErrorMessage,
} = require("../../services/records");
const { getSession, isGuardian } = require("../../store/session");
const { requireAuth, requireEditor } = require("../../utils/permission");
const {
  buildAttachmentFileList,
  createAttachmentRefFromUploadResult,
  normalizeAttachmentList,
  openAttachment,
  serializeAttachmentList,
} = require("../../utils/attachment");
const { getToday, formatDate } = require("../../utils/date");
const Dialog = require("@vant/weapp/dialog/dialog").default;

Page({
  data: {
    isEdit: false,
    readOnly: false,
    pendingStudentId: "",
    recordId: "",
    serviceDate: "",
    status: "completed",
    statusText: "已用餐",
    remark: "",
    fileList: [],
    attachments: [],
    selectedStudent: {},
    showStudentPicker: false,
    showDatePicker: false,
    studentColumns: [],
    students: [],
    submitting: false,
  },

  onLoad(options) {
    const readOnly = options.mode === "view";
    if (readOnly) {
      if (!requireAuth()) return;
    } else if (!requireEditor()) {
      return;
    }

    const isEdit = !!options.id;
    this.setData({
      serviceDate: options.date || getToday(),
      isEdit,
      pendingStudentId: options.studentId || "",
      readOnly,
      recordId: options.id || "",
      statusText: getMealStatusText("completed"),
    });
    wx.setNavigationBarTitle({
      title: readOnly ? "查看用餐记录" : isEdit ? "编辑用餐记录" : "新增用餐记录",
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
      const nextData = {
        students: list,
        studentColumns: list.map((s) => ({ text: buildStudentLabel(s), value: s.id })),
      };
      if (!this.data.isEdit && this.data.pendingStudentId) {
        const selectedStudent = list.find((s) => String(s.id) === String(this.data.pendingStudentId));
        if (selectedStudent) {
          nextData.selectedStudent = { id: selectedStudent.id, name: buildStudentLabel(selectedStudent) };
        }
      } else if (!this.data.isEdit && !this.data.selectedStudent.id && list.length === 1) {
        nextData.selectedStudent = { id: list[0].id, name: buildStudentLabel(list[0]) };
      }
      this.setData(nextData);
    } catch (e) {
      console.warn("加载学生失败", e);
    }
  },

  async loadRecord(id) {
    try {
      const params = { id };
      if (isGuardian()) {
        params.guardianPhone = getSession().user?.phone;
      }
      const res = await getMealRecords(params);
      const records = res.items || res || [];
      const record = Array.isArray(records) ? records.find((r) => String(r.id) === String(id)) : records;
      if (!record) {
        wx.showToast({ title: "记录不存在或无权限", icon: "none" });
        return;
      }

      const student = this.data.students.find((s) => String(s.id) === String(record.studentId)) || {};
      const attachments = normalizeAttachmentList(record.imageUrls);
      const fileList = buildAttachmentFileList(attachments);
      this.setData({
        status: record.status || "completed",
        statusText: getMealStatusText(record.status || "completed"),
        remark: record.remark || "",
        serviceDate: record.serviceDate || getToday(),
        selectedStudent: { id: record.studentId, name: buildRecordStudentLabel(record, student) },
        attachments,
        fileList,
      });
    } catch (e) {
      console.warn("加载记录失败", e);
      wx.showToast({ title: "加载记录失败", icon: "none" });
    }
  },

  openStudentPicker() {
    if (this.data.readOnly) return;
    this.setData({ showStudentPicker: true });
  },
  closeStudentPicker() {
    this.setData({ showStudentPicker: false });
  },

  onStudentConfirm(e) {
    const val = extractPickerValue(e.detail);
    const student = this.data.students.find((s) => String(s.id) === String(val));
    if (student) {
      this.setData({ selectedStudent: { id: student.id, name: buildStudentLabel(student) } });
    }
    this.closeStudentPicker();
  },

  openDatePicker() {
    if (this.data.readOnly) return;
    this.setData({ showDatePicker: true });
  },
  closeDatePicker() {
    this.setData({ showDatePicker: false });
  },

  onDateConfirm(e) {
    this.setData({ showDatePicker: false, serviceDate: formatDate(new Date(e.detail)) });
  },

  onStatusChange(e) {
    this.setData({ status: e.detail, statusText: getMealStatusText(e.detail) });
  },
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  async chooseImages() {
    if (this.data.readOnly) return;

    const remainCount = 9 - this.data.fileList.length;
    if (remainCount <= 0) {
      wx.showToast({ title: "最多上传9张", icon: "none" });
      return;
    }

    try {
      await ensurePrivacyAuthorization();
      const files = await chooseImageFiles(Math.min(remainCount, 9));

      if (files.length === 0) {
        return;
      }

      await this.uploadSelectedFiles(files);
    } catch (error) {
      if (error && String(error.errMsg || "").includes("cancel")) {
        return;
      }
      console.warn("选择图片失败", error);
      showErrorDialog("选择图片失败", resolvePrivacyErrorMessage(error));
    }
  },

  async uploadSelectedFiles(files) {
    for (const f of files) {
      try {
        wx.showLoading({ title: "上传中..." });
        const res = await uploadAttachment({
          contentType: f.type,
          fileName: f.name,
          filePath: f.url || f.path,
          fileSize: f.size,
        });
        const attachment = createAttachmentRefFromUploadResult(res, f.name);
        const attachments = [...this.data.attachments, attachment];
        const fileList = [...this.data.fileList, ...buildAttachmentFileList([attachment])];
        this.setData({ attachments, fileList });
      } catch (err) {
        console.warn("上传图片失败", err);
        showErrorDialog("上传失败", resolveUploadErrorMessage(err));
      } finally {
        wx.hideLoading();
      }
    }
  },

  onDeleteImage(e) {
    if (this.data.readOnly) return;
    const idx = e.detail && e.detail.index !== undefined
      ? Number(e.detail.index)
      : Number(e.currentTarget.dataset.index || 0);
    const attachments = [...this.data.attachments];
    const fileList = [...this.data.fileList];
    attachments.splice(idx, 1);
    fileList.splice(idx, 1);
    this.setData({ attachments, fileList });
  },

  onDeleteAttachment(e) {
    if (this.data.readOnly) return;
    const idx = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index) || 0);
    const attachments = [...this.data.attachments];
    const fileList = [...this.data.fileList];
    attachments.splice(idx, 1);
    fileList.splice(idx, 1);
    this.setData({ attachments, fileList });
  },

  onPreviewAttachment(e) {
    const idx = e.detail && e.detail.index !== undefined
      ? Number(e.detail.index)
      : Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index) || 0);
    const attachment = this.data.attachments[idx];
    if (!attachment) {
      return;
    }

    openAttachment(attachment, this.data.attachments).catch((error) => {
      wx.showToast({ title: (error && error.message) || "打开失败", icon: "none" });
    });
  },

  async onSubmit() {
    if (this.data.readOnly) return;
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
        imageUrls: serializeAttachmentList(this.data.attachments),
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
    if (this.data.readOnly) return;
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

function buildStudentLabel(student) {
  const gradeName = student.gradeName || student.grade || "";
  const className = student.className || "";
  const suffix = [gradeName, className].filter(Boolean).join(" ");
  return suffix ? `${student.name}（${suffix}）` : student.name;
}

function buildRecordStudentLabel(record, student) {
  const studentName = record.studentName || student.name || "";
  const gradeName = record.gradeName || record.grade || student.gradeName || student.grade || "";
  const className = record.className || student.className || "";
  const suffix = [gradeName, className].filter(Boolean).join(" ");
  return suffix ? `${studentName}（${suffix}）` : studentName;
}

function getMealStatusText(status) {
  const map = {
    completed: "已用餐",
    absent: "未用餐",
  };
  return map[status] || status;
}

function extractPickerValue(detail) {
  if (!detail) return "";
  let value = detail.value;
  if (Array.isArray(value)) {
    value = value[0];
  }
  if (value && typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "value")) {
      return value.value;
    }
    if (Object.prototype.hasOwnProperty.call(value, "text")) {
      return value.text;
    }
  }
  return value;
}

async function chooseImageFiles(count) {
  const maxCount = Math.min(Number(count || 1), 9);
  const result = await new Promise((resolve, reject) => {
    wx.chooseImage({
      count: maxCount,
      sourceType: ["album", "camera"],
      sizeType: ["compressed"],
      success: resolve,
      fail: reject,
    });
  });
  return normalizeChosenFiles(result);
}

function normalizeChosenFiles(result) {
  const tempFiles = Array.isArray(result && result.tempFiles) ? result.tempFiles : [];
  const tempFilePaths = Array.isArray(result && result.tempFilePaths) ? result.tempFilePaths : [];

  return (tempFiles.length > 0 ? tempFiles : tempFilePaths.map((path) => ({ path })))
    .map((item) => {
      const filePath = item.tempFilePath || item.path || "";
      return {
        name: getImageName(filePath),
        path: filePath,
        size: item.size,
        type: "image",
        url: filePath,
      };
    })
    .filter((item) => item.path);
}

function ensurePrivacyAuthorization() {
  if (typeof wx.requirePrivacyAuthorize !== "function") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    wx.requirePrivacyAuthorize({
      success: resolve,
      fail: reject,
    });
  });
}

function resolvePrivacyErrorMessage(error) {
  if (Number(error && error.errno) === 112) {
    return "请先补充隐私指引";
  }

  return String((error && (error.errMsg || error.message)) || "选择图片失败");
}

function showErrorDialog(title, content) {
  wx.showModal({
    title,
    content: String(content || title),
    showCancel: false,
  });
}
