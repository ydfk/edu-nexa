const { getStudents, getHomeworkRecords, saveHomeworkRecord, uploadAttachment } = require("../../services/records");
const { getRuntimeSettings } = require("../../services/common");
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
    pendingSubject: "",
    recordId: "",
    assignmentId: "",
    serviceDate: "",
    status: "completed",
    statusText: "已完成",
    subject: "",
    homeworkContent: "",
    remark: "",
    fileList: [],
    attachments: [],
    selectedStudent: {},
    showStudentPicker: false,
    showSubjectPicker: false,
    showDatePicker: false,
    studentColumns: [],
    subjectColumns: [],
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
      assignmentId: options.assignmentId || "",
      serviceDate: options.date || getToday(),
      isEdit,
      pendingStudentId: options.studentId || "",
      pendingSubject: decodeURIComponent(options.subject || ""),
      readOnly,
      recordId: options.id || "",
      statusText: getHomeworkStatusText("completed"),
    });
    wx.setNavigationBarTitle({
      title: readOnly ? "查看作业记录" : isEdit ? "编辑作业记录" : "新增作业记录",
    });
    if (!readOnly) {
      this.loadStudents();
      this.loadSubjects();
    }
    if (options.id) this.loadRecord(options.id);
  },

  async loadStudents() {
    try {
      const params = { status: "active" };
      if (isGuardian()) {
        params.guardianPhone = getSession().user?.phone;
      }
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

  async loadSubjects() {
    try {
      const settings = await getRuntimeSettings();
      const subjects = parseRuntimeOptionList(
        settings.homeworkSubjects,
        ["语文", "数学", "英语", "其他"],
      );
      const subjectColumns = subjects.map((s) => toPickerOption(s));
      const nextData = {
        subject: !this.data.subject && subjectColumns.length === 1 ? String(subjectColumns[0].value || "") : this.data.subject,
        subjectColumns,
      };
      if (!this.data.isEdit && this.data.pendingSubject) {
        nextData.subject = this.data.pendingSubject;
      }
      this.setData(nextData);
    } catch (e) {
      const subjectColumns = ["语文", "数学", "英语"].map((s) => ({ text: s, value: s }));
      const nextData = {
        subject: !this.data.subject && subjectColumns.length === 1 ? String(subjectColumns[0].value || "") : this.data.subject,
        subjectColumns,
      };
      if (!this.data.isEdit && this.data.pendingSubject) {
        nextData.subject = this.data.pendingSubject;
      }
      this.setData(nextData);
    }
  },

  async loadRecord(id) {
    try {
      const params = { id };
      if (isGuardian()) {
        params.guardianPhone = getSession().user?.phone;
      }
      const res = await getHomeworkRecords(params);
      const records = res.items || res || [];
      const record = Array.isArray(records) ? records.find((r) => String(r.id) === String(id)) : records;
      if (!record) {
        wx.showToast({ title: "记录不存在或无权限", icon: "none" });
        return;
      }
      const attachments = normalizeAttachmentList(record.imageUrls);
      const fileList = buildAttachmentFileList(attachments);
      this.setData({
        assignmentId: String(record.assignmentId || ""),
        status: String(record.status || "completed"),
        statusText: getHomeworkStatusText(String(record.status || "completed")),
        subject: String(record.subject || ""),
        homeworkContent: buildHomeworkContent(record),
        remark: String(record.remark || ""),
        serviceDate: String(record.serviceDate || getToday()),
        selectedStudent: { id: String(record.studentId || ""), name: buildRecordStudentLabel(record) },
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
    if (student) this.setData({ selectedStudent: { id: student.id, name: buildStudentLabel(student) } });
    this.closeStudentPicker();
  },

  openSubjectPicker() {
    if (this.data.readOnly) return;
    this.setData({ showSubjectPicker: true });
  },
  closeSubjectPicker() {
    this.setData({ showSubjectPicker: false });
  },
  onSubjectConfirm(e) {
    this.setData({ subject: String(extractPickerValue(e.detail) || ""), showSubjectPicker: false });
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
    this.setData({ status: e.detail, statusText: getHomeworkStatusText(e.detail) });
  },
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  async afterRead(e) {
    if (this.data.readOnly) return;
    const { file } = e.detail;
    const files = Array.isArray(file) ? file : [file];
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
        wx.showToast({ title: "上传失败", icon: "none" });
      } finally {
        wx.hideLoading();
      }
    }
  },

  onDeleteImage(e) {
    if (this.data.readOnly) return;
    const idx = e.detail.index;
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
        assignmentId: this.data.assignmentId,
        studentId: this.data.selectedStudent.id,
        serviceDate: this.data.serviceDate,
        status: this.data.status,
        subject: this.data.subject,
        subjectSummary: this.data.homeworkContent,
        remark: this.data.remark,
        imageUrls: serializeAttachmentList(this.data.attachments),
      };
      if (this.data.isEdit) payload.id = this.data.recordId;
      await saveHomeworkRecord(payload);
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
          await request({ method: "DELETE", url: `/homework-records/${this.data.recordId}` });
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

function parseRuntimeOptionList(raw, fallback = []) {
  if (Array.isArray(raw)) {
    return raw.filter(Boolean);
  }

  const text = String(raw || "").trim();
  if (!text) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean);
    }
  } catch (error) {
  }

  return text
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildRecordStudentLabel(record) {
  const gradeName = String(record.gradeName || record.grade || "");
  const className = String(record.className || "");
  const suffix = [gradeName, className].filter(Boolean).join(" ");
  const studentName = String(record.studentName || "");
  return suffix ? `${studentName}（${suffix}）` : studentName;
}

function getHomeworkStatusText(status) {
  const map = {
    completed: "已完成",
    partial: "部分完成",
    pending: "待处理",
  };
  return map[status] || status;
}

function toPickerOption(item) {
  if (typeof item === "string") {
    return { text: item, value: item };
  }
  if (item && typeof item === "object") {
    const value = item.value || item.name || item.label || "";
    const text = item.text || item.name || item.label || String(value || "");
    return { text, value: value || text };
  }
  const value = String(item || "");
  return { text: value, value };
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

function buildHomeworkContent(record) {
  if (!record || typeof record !== "object") {
    return "";
  }
  const summary = String(record.subjectSummary || "").trim();
  if (summary) {
    return summary;
  }
  const content = String(record.content || "").trim();
  if (content) {
    return content;
  }
  const items = Array.isArray(record.items) ? record.items : [];
  return items
    .map((item) => String((item && item.content) || "").trim())
    .filter(Boolean)
    .join("；");
}
