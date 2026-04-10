const { getAttachmentAccessURL, getStudents, getHomeworkRecords, saveHomeworkRecord, uploadAttachment } = require("../../services/records");
const { getRuntimeSettings } = require("../../services/common");
const { getSession, isGuardian } = require("../../store/session");
const { requireAuth, requireEditor } = require("../../utils/permission");
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
    imageUrls: [],
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
      }
      this.setData(nextData);
    } catch (e) {
      console.warn("加载学生失败", e);
    }
  },

  async loadSubjects() {
    try {
      const settings = await getRuntimeSettings();
      const subjects = settings.homeworkSubjects || ["语文", "数学", "英语"];
      const nextData = { subjectColumns: subjects.map((s) => toPickerOption(s)) };
      if (!this.data.isEdit && this.data.pendingSubject) {
        nextData.subject = this.data.pendingSubject;
      }
      this.setData(nextData);
    } catch (e) {
      const nextData = { subjectColumns: ["语文", "数学", "英语"].map((s) => ({ text: s, value: s })) };
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
      const imageUrls = normalizeImageURLs(record.imageUrls);
      const fileList = await buildImageFileList(imageUrls);
      this.setData({
        assignmentId: String(record.assignmentId || ""),
        status: String(record.status || "completed"),
        statusText: getHomeworkStatusText(String(record.status || "completed")),
        subject: String(record.subject || ""),
        homeworkContent: buildHomeworkContent(record),
        remark: String(record.remark || ""),
        serviceDate: String(record.serviceDate || getToday()),
        selectedStudent: { id: String(record.studentId || ""), name: buildRecordStudentLabel(record) },
        imageUrls,
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
        const rawURL = res.url || res;
        const previewURL = await resolveImagePreviewURL(rawURL);
        const urls = [...this.data.imageUrls, rawURL];
        const fl = [...this.data.fileList, { isImage: true, name: f.name || `img${urls.length}`, url: previewURL }];
        this.setData({ imageUrls: urls, fileList: fl });
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
    const urls = [...this.data.imageUrls];
    const fl = [...this.data.fileList];
    urls.splice(idx, 1);
    fl.splice(idx, 1);
    this.setData({ imageUrls: urls, fileList: fl });
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
        imageUrls: this.data.imageUrls,
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

async function buildImageFileList(urls) {
  const fileItems = [];

  for (const url of urls || []) {
    const previewURL = await resolveImagePreviewURL(url);
    fileItems.push({
      isImage: true,
      name: getImageName(url),
      url: previewURL,
    });
  }

  return fileItems;
}

async function resolveImagePreviewURL(rawURL) {
  if (!rawURL) {
    return "";
  }

  try {
    const result = await getAttachmentAccessURL({
      disposition: "inline",
      fileName: getImageName(rawURL),
      url: rawURL,
    });
    return result.url || rawURL;
  } catch (error) {
    return rawURL;
  }
}

function getImageName(url) {
  const parts = String(url || "")
    .split("#")[0]
    .split("?")[0]
    .split("/");
  return parts[parts.length - 1] || "图片";
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

function normalizeImageURLs(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }
  try {
    const parsed = JSON.parse(String(raw));
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || "").trim()).filter(Boolean);
    }
  } catch (error) {
    // 兼容历史逗号分隔字段
  }
  return String(raw)
    .split(",")
    .map((item) => item.trim().replace(/^\[/, "").replace(/\]$/, "").replace(/^"/, "").replace(/"$/, ""))
    .filter(Boolean);
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
