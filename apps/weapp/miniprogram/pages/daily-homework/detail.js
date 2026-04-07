const {
  getAttachmentAccessURL,
  getDailyHomework,
  saveDailyHomework,
  uploadAttachment,
} = require("../../services/records");
const { getSchools, getGrades, getClasses } = require("../../services/schools");
const { getRuntimeSettings } = require("../../services/common");
const { requireEditor } = require("../../utils/permission");
const { getToday, formatDate } = require("../../utils/date");
const Dialog = require("@vant/weapp/dialog/dialog").default;

Page({
  data: {
    isEdit: false,
    homeworkId: "",
    serviceDate: "",
    subject: "",
    content: "",
    remark: "",
    fileList: [],
    imageUrls: [],
    submitting: false,

    selectedSchool: {},
    selectedGrade: {},
    selectedClass: {},

    schools: [],
    grades: [],
    classes: [],

    schoolColumns: [],
    gradeColumns: [],
    classColumns: [],
    subjectColumns: [],

    showSchoolPicker: false,
    showGradePicker: false,
    showClassPicker: false,
    showSubjectPicker: false,
    showDatePicker: false,
  },

  onLoad(options) {
    if (!requireEditor()) return;
    this.setData({
      isEdit: !!options.id,
      homeworkId: options.id || "",
      serviceDate: options.date || getToday(),
    });
    this.loadSchools();
    this.loadSettings();
    if (options.id) this.loadHomework(options.id);
  },

  async loadSettings() {
    try {
      const settings = await getRuntimeSettings();
      const subjects = settings.subjects || settings.homeworkSubjects || [];
      this.setData({
        subjectColumns: subjects.map((s) => typeof s === "string" ? { text: s, value: s } : { text: s.name || s.label, value: s.name || s.value }),
      });
    } catch (e) {
      console.warn("加载设置失败", e);
    }
  },

  async loadHomework(id) {
    try {
      const res = await getDailyHomework({ id });
      const list = res.items || res || [];
      const hw = Array.isArray(list) ? list.find((h) => String(h.id) === String(id)) : list;
      if (!hw) return;
      const attachmentUrls = parseAttachments(hw.attachments);
      const fileList = await buildAttachmentFileList(attachmentUrls);
      this.setData({
        serviceDate: hw.serviceDate || getToday(),
        subject: hw.subject || "",
        content: hw.content || "",
        remark: hw.remark || "",
        imageUrls: attachmentUrls,
        fileList,
        selectedSchool: { id: hw.schoolId, name: hw.schoolName },
        selectedGrade: { id: hw.gradeId, name: hw.gradeName || hw.grade },
        selectedClass: { id: hw.classId, name: buildClassLabel(hw.gradeName || hw.grade, hw.className) },
      });
      if (hw.schoolId) this.loadGrades(hw.schoolId);
      if (hw.gradeId) this.loadClasses(hw.gradeId);
    } catch (e) {
      console.warn("加载作业详情失败", e);
    }
  },

  async loadSchools() {
    try {
      const res = await getSchools();
      const list = res.items || res || [];
      this.setData({
        schools: list,
        schoolColumns: list.map((s) => ({ text: s.name, value: s.id })),
      });
    } catch (e) {
      console.warn("加载学校失败", e);
    }
  },

  async loadGrades(schoolId) {
    try {
      const res = await getGrades({ schoolId });
      const list = res.items || res || [];
      this.setData({
        grades: list,
        gradeColumns: list.map((g) => ({ text: g.name, value: g.id })),
      });
    } catch (e) {
      console.warn("加载年级失败", e);
    }
  },

  async loadClasses(gradeId) {
    try {
      const res = await getClasses({ gradeId });
      const list = res.items || res || [];
      this.setData({
        classes: list,
        classColumns: list.map((c) => ({ text: buildClassLabel(this.data.selectedGrade.name, c.name), value: c.id })),
      });
    } catch (e) {
      console.warn("加载班级失败", e);
    }
  },

  onContentInput(e) { this.setData({ content: e.detail.value }); },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }); },

  openSchoolPicker() { this.setData({ showSchoolPicker: true }); },
  closeSchoolPicker() { this.setData({ showSchoolPicker: false }); },
  onSchoolConfirm(e) {
    const val = e.detail.value;
    const school = this.data.schools.find((s) => s.id === val);
    if (school) {
      this.setData({
        selectedSchool: { id: school.id, name: school.name },
        selectedGrade: {},
        selectedClass: {},
        gradeColumns: [],
        classColumns: [],
      });
      this.loadGrades(school.id);
    }
    this.closeSchoolPicker();
  },

  openGradePicker() {
    if (!this.data.selectedSchool.id) {
      wx.showToast({ title: "请先选择学校", icon: "none" });
      return;
    }
    this.setData({ showGradePicker: true });
  },
  closeGradePicker() { this.setData({ showGradePicker: false }); },
  onGradeConfirm(e) {
    const val = e.detail.value;
    const grade = this.data.grades.find((g) => g.id === val);
    if (grade) {
      this.setData({
        selectedGrade: { id: grade.id, name: grade.name },
        selectedClass: {},
        classColumns: [],
      });
      this.loadClasses(grade.id);
    }
    this.closeGradePicker();
  },

  openClassPicker() {
    if (!this.data.selectedGrade.id) {
      wx.showToast({ title: "请先选择年级", icon: "none" });
      return;
    }
    this.setData({ showClassPicker: true });
  },
  closeClassPicker() { this.setData({ showClassPicker: false }); },
  onClassConfirm(e) {
    const val = e.detail.value;
    const cls = this.data.classes.find((c) => c.id === val);
    if (cls) {
      this.setData({ selectedClass: { id: cls.id, name: buildClassLabel(this.data.selectedGrade.name, cls.name) } });
    }
    this.closeClassPicker();
  },

  openSubjectPicker() { this.setData({ showSubjectPicker: true }); },
  closeSubjectPicker() { this.setData({ showSubjectPicker: false }); },
  onSubjectConfirm(e) {
    this.setData({ subject: e.detail.value, showSubjectPicker: false });
  },

  openDatePicker() { this.setData({ showDatePicker: true }); },
  closeDatePicker() { this.setData({ showDatePicker: false }); },
  onDateConfirm(e) {
    this.setData({ showDatePicker: false, serviceDate: formatDate(new Date(e.detail)) });
  },

  async afterRead(e) {
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
          purpose: "daily-homework",
        });
        const rawURL = res.url || res;
        const previewURL = await resolveAttachmentPreviewURL(rawURL, f.name);
        const urls = [...this.data.imageUrls, rawURL];
        const fl = [
          ...this.data.fileList,
          buildAttachmentFileItem(rawURL, previewURL, f.name),
        ];
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
    if (!this.data.selectedClass.id) {
      wx.showToast({ title: "请选择班级", icon: "none" });
      return;
    }
    if (!this.data.subject) {
      wx.showToast({ title: "请选择科目", icon: "none" });
      return;
    }
    if (!this.data.content.trim()) {
      wx.showToast({ title: "请输入作业内容", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      const payload = {
        schoolId: this.data.selectedSchool.id,
        gradeId: this.data.selectedGrade.id,
        classId: this.data.selectedClass.id,
        serviceDate: this.data.serviceDate,
        subject: this.data.subject,
        content: this.data.content.trim(),
        remark: this.data.remark,
        attachments: serializeAttachments(this.data.imageUrls),
      };
      if (this.data.isEdit) payload.id = this.data.homeworkId;
      await saveDailyHomework(payload);
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
          await request({ method: "DELETE", url: `/daily-homework/${this.data.homeworkId}` });
          wx.showToast({ title: "已删除", icon: "success" });
          setTimeout(() => wx.navigateBack(), 800);
        } catch (e) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      })
      .catch(() => {});
  },
});

function buildClassLabel(gradeName, className) {
  return [gradeName, className].filter(Boolean).join(" ");
}

function parseAttachments(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const items = JSON.parse(String(raw));
    if (Array.isArray(items)) {
      return items.filter((item) => typeof item === "string" && item.trim());
    }
  } catch (error) {
    // 兼容旧的逗号分隔格式
  }
  return String(raw)
    .split(",")
    .map((item) => item.trim().replace(/^\[/, "").replace(/\]$/, "").replace(/^"/, "").replace(/"$/, ""))
    .filter(Boolean);
}

function serializeAttachments(items) {
  return JSON.stringify((items || []).filter(Boolean));
}

async function buildAttachmentFileList(urls) {
  const fileItems = [];

  for (const url of urls || []) {
    const previewURL = await resolveAttachmentPreviewURL(url, getAttachmentName(url));
    fileItems.push(buildAttachmentFileItem(url, previewURL, getAttachmentName(url)));
  }

  return fileItems;
}

function buildAttachmentFileItem(rawURL, previewURL, fileName) {
  const type = getAttachmentType(rawURL);
  return {
    isImage: type === "image",
    name: fileName || getAttachmentName(rawURL),
    url: previewURL || "",
  };
}

function getAttachmentType(url) {
  const lower = String(url || "").split("#")[0].split("?")[0].toLowerCase();
  if (lower.endsWith(".pdf")) {
    return "pdf";
  }
  return "image";
}

function getAttachmentName(url) {
  const parts = String(url || "").split("#")[0].split("?")[0].split("/");
  return parts[parts.length - 1] || "附件";
}

async function resolveAttachmentPreviewURL(rawURL, fileName) {
  if (!rawURL) {
    return "";
  }

  try {
    const result = await getAttachmentAccessURL({
      disposition: "inline",
      fileName: fileName || getAttachmentName(rawURL),
      url: rawURL,
    });
    return result.url || rawURL;
  } catch (error) {
    return rawURL;
  }
}

