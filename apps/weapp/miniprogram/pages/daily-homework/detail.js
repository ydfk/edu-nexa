const { getDailyHomework, saveDailyHomework, uploadAttachment } = require("../../services/records");
const { getSchools, getGrades, getClasses } = require("../../services/schools");
const { getRuntimeSettings } = require("../../services/common");
const { requireEditor } = require("../../utils/permission");
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
    homeworkId: "",
    serviceDate: "",
    subject: "",
    content: "",
    fileList: [],
    attachments: [],
    submitting: false,

    selectedSchool: {},
    selectedGrade: {},
    selectedClass: {},

    schools: [],
    grades: [],
    classes: [],

    scopeOptions: [],
    selectedScopeIndex: 0,
    subjectColumns: [],

    showDatePicker: false,
  },

  onLoad(options) {
    if (!requireEditor()) return;
    this.setData({
      isEdit: !!options.id,
      homeworkId: options.id || "",
      serviceDate: options.date || getToday(),
    });
    this.loadScopeOptions();
    this.loadSettings();
    if (options.id) this.loadHomework(options.id);
  },

  async loadSettings() {
    try {
      const settings = await getRuntimeSettings();
      const subjects = parseRuntimeOptionList(
        settings.homeworkSubjects,
        ["语文", "数学", "英语", "其他"],
      );
      const subjectColumns = subjects
        .map((item) =>
          typeof item === "string"
            ? { text: item, value: item }
            : { text: item.name || item.label, value: item.name || item.value },
        )
        .filter((item) => item.text && item.value);

      this.setData({
        subject: !this.data.subject && subjectColumns.length === 1
          ? String(subjectColumns[0].value || "")
          : this.data.subject,
        subjectColumns,
      });
    } catch (e) {
      console.warn("加载设置失败", e);
    }
  },

  async loadHomework(id) {
    try {
      const res = await getDailyHomework({ id });
      const list = res.items || res || [];
      const hw = Array.isArray(list) ? list.find((item) => String(item.id) === String(id)) : list;
      if (!hw) return;

      const attachments = normalizeAttachmentList(hw.attachments);
      const fileList = buildAttachmentFileList(attachments);

      this.setData({
        serviceDate: hw.serviceDate || getToday(),
        subject: hw.subject || "",
        content: hw.content || "",
        attachments,
        fileList,
        selectedSchool: { id: hw.schoolId, name: hw.schoolName },
        selectedGrade: { id: hw.gradeId || "", name: hw.gradeName || hw.grade },
        selectedClass: { id: hw.classId, name: hw.className || "" },
      });
      this.syncSelectedScopeIndex();
    } catch (e) {
      console.warn("加载作业详情失败", e);
    }
  },

  async loadScopeOptions() {
    try {
      const [schoolsRes, gradesRes, classesRes] = await Promise.all([
        getSchools().catch(() => []),
        getGrades().catch(() => []),
        getClasses().catch(() => []),
      ]);
      const schools = sortSchoolItems(schoolsRes.items || schoolsRes || []);
      const grades = sortGradeItems(gradesRes.items || gradesRes || []);
      const classes = sortClassItems(classesRes.items || classesRes || []);
      const scopeOptions = buildScopeOptions(schools, grades, classes);

      this.setData({
        schools,
        grades,
        classes,
        scopeOptions,
      });
      this.syncSelectedScopeIndex({ scopeOptions });
    } catch (e) {
      console.warn("加载班级范围失败", e);
      this.setData({
        schools: [],
        grades: [],
        classes: [],
        scopeOptions: [],
        selectedScopeIndex: 0,
      });
    }
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onSubjectChange(e) {
    this.setData({ subject: String(e.detail || "") });
  },

  onScopeChange(e) {
    const selectedScopeIndex = Number(e.detail.value);
    const option = this.data.scopeOptions[selectedScopeIndex] || null;
    this.applyScopeOption(option, selectedScopeIndex);
  },

  openDatePicker() {
    this.setData({ showDatePicker: true });
  },

  closeDatePicker() {
    this.setData({ showDatePicker: false });
  },

  onDateConfirm(e) {
    this.setData({
      showDatePicker: false,
      serviceDate: formatDate(new Date(e.detail)),
    });
  },

  async afterRead(e) {
    const { file } = e.detail;
    const files = Array.isArray(file) ? file : [file];

    for (const item of files) {
      try {
        wx.showLoading({ title: "上传中..." });
        const res = await uploadAttachment({
          contentType: item.type,
          fileName: item.name,
          filePath: item.url || item.path,
          fileSize: item.size,
          purpose: "daily-homework",
        });
        const attachment = createAttachmentRefFromUploadResult(res, item.name);
        const nextAttachments = [...this.data.attachments, attachment];
        const nextFileList = [
          ...this.data.fileList,
          ...buildAttachmentFileList([attachment]),
        ];
        this.setData({
          attachments: nextAttachments,
          fileList: nextFileList,
        });
      } catch (err) {
        wx.showToast({ title: "上传失败", icon: "none" });
      } finally {
        wx.hideLoading();
      }
    }
  },

  onDeleteImage(e) {
    const idx = Number(e.detail.index || 0);
    const nextAttachments = [...this.data.attachments];
    const nextFileList = [...this.data.fileList];
    nextAttachments.splice(idx, 1);
    nextFileList.splice(idx, 1);
    this.setData({
      attachments: nextAttachments,
      fileList: nextFileList,
    });
  },

  onDeleteAttachment(e) {
    const idx = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index) || 0);
    const nextAttachments = [...this.data.attachments];
    const nextFileList = [...this.data.fileList];
    nextAttachments.splice(idx, 1);
    nextFileList.splice(idx, 1);
    this.setData({
      attachments: nextAttachments,
      fileList: nextFileList,
    });
  },

  onPreviewAttachment(e) {
    const idx = Number(
      (e.detail && e.detail.index) ||
      (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index) ||
      0,
    );
    const attachment = this.data.attachments[idx];
    if (!attachment) {
      return;
    }

    openAttachment(attachment, this.data.attachments).catch((error) => {
      wx.showToast({ title: (error && error.message) || "打开失败", icon: "none" });
    });
  },

  async onSubmit() {
    const selectedScope = resolveSelectedScopeOption(this.data);
    const selectedSchool = {
      id: String(this.data.selectedSchool.id || selectedScope.schoolId || "").trim(),
      name: String(this.data.selectedSchool.name || selectedScope.schoolName || "").trim(),
    };
    const selectedGrade = {
      id: String(this.data.selectedGrade.id || selectedScope.gradeId || "").trim(),
      name: String(this.data.selectedGrade.name || selectedScope.gradeName || "").trim(),
    };
    const selectedClass = {
      id: String(this.data.selectedClass.id || selectedScope.classId || "").trim(),
      name: String(this.data.selectedClass.name || selectedScope.className || "").trim(),
    };

    if (!selectedClass.id && !(selectedSchool.name && selectedGrade.name && selectedClass.name)) {
      wx.showToast({ title: "请选择班级", icon: "none" });
      return;
    }
    if (!String(this.data.subject || "").trim()) {
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
        schoolId: selectedSchool.id,
        schoolName: selectedSchool.name,
        gradeName: selectedGrade.name,
        classId: selectedClass.id,
        className: selectedClass.name,
        serviceDate: this.data.serviceDate,
        subject: String(this.data.subject || "").trim(),
        content: this.data.content.trim(),
        attachments: serializeAttachmentList(this.data.attachments),
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
          await request({
            method: "DELETE",
            url: `/daily-homework/${this.data.homeworkId}`,
          });
          wx.showToast({ title: "已删除", icon: "success" });
          setTimeout(() => wx.navigateBack(), 800);
        } catch (e) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      })
      .catch(() => {});
  },

  applyScopeOption(option, selectedScopeIndex) {
    if (!option) {
      this.setData({
        selectedScopeIndex: 0,
        selectedSchool: {},
        selectedGrade: {},
        selectedClass: {},
      });
      return;
    }

    this.setData({
      selectedScopeIndex,
      selectedSchool: { id: option.schoolId, name: option.schoolName },
      selectedGrade: { id: option.gradeId, name: option.gradeName },
      selectedClass: { id: option.classId, name: option.className },
    });
  },

  syncSelectedScopeIndex(patch = {}) {
    const scopeOptions = patch.scopeOptions || this.data.scopeOptions || [];
    const selectedSchool = patch.selectedSchool || this.data.selectedSchool || {};
    const selectedGrade = patch.selectedGrade || this.data.selectedGrade || {};
    const selectedClass = patch.selectedClass || this.data.selectedClass || {};

    if (scopeOptions.length === 0) {
      this.setData({ selectedScopeIndex: 0 });
      return;
    }

    const selectedIndex = findScopeIndex(scopeOptions, selectedClass.id);
    if (selectedIndex >= 0) {
      this.applyScopeOption(scopeOptions[selectedIndex], selectedIndex);
      return;
    }

    if (
      !this.data.isEdit &&
      !selectedSchool.id &&
      !selectedGrade.id &&
      !selectedClass.id &&
      scopeOptions.length === 1
    ) {
      this.applyScopeOption(scopeOptions[0], 0);
      return;
    }

    this.setData({ selectedScopeIndex: 0 });
  },
});

function buildScopeOptions(schools, grades, classes) {
  const schoolMap = buildIdMap(schools);
  const gradeMap = buildIdMap(grades);

  return [...(classes || [])]
    .map((item) => {
      const school = schoolMap[String(item.schoolId || "")] || {};
      const grade = gradeMap[String(item.gradeId || "")] || {};
      const schoolName = String(item.schoolName || school.name || "").trim();
      const gradeName = String(item.gradeName || grade.name || "").trim();
      const className = String(item.name || "").trim();

      return {
        label: buildScopeLabel(schoolName, gradeName, className),
        schoolId: item.schoolId || school.id || "",
        schoolName,
        schoolSort: resolveSortValue(school),
        gradeId: item.gradeId || grade.id || "",
        gradeName,
        gradeSort: resolveSortValue(grade),
        classId: item.id || "",
        className,
        classSort: resolveSortValue(item),
      };
    })
    .filter((item) => item.label && item.schoolId && item.gradeId && item.classId)
    .sort((a, b) => {
      const schoolSortDiff = a.schoolSort - b.schoolSort;
      if (schoolSortDiff !== 0) {
        return schoolSortDiff;
      }

      const schoolNameDiff = String(a.schoolName || "").localeCompare(String(b.schoolName || ""), "zh-CN");
      if (schoolNameDiff !== 0) {
        return schoolNameDiff;
      }

      const gradeSortDiff = a.gradeSort - b.gradeSort;
      if (gradeSortDiff !== 0) {
        return gradeSortDiff;
      }

      const gradeNameDiff = String(a.gradeName || "").localeCompare(String(b.gradeName || ""), "zh-CN");
      if (gradeNameDiff !== 0) {
        return gradeNameDiff;
      }

      const classSortDiff = a.classSort - b.classSort;
      if (classSortDiff !== 0) {
        return classSortDiff;
      }

      return String(a.className || "").localeCompare(String(b.className || ""), "zh-CN");
    });
}

function buildIdMap(items) {
  return (items || []).reduce((map, item) => {
    if (!item || !item.id) {
      return map;
    }
    map[String(item.id)] = item;
    return map;
  }, {});
}

function buildScopeLabel(schoolName, gradeName, className) {
  return [schoolName, gradeName, className].filter(Boolean).join("/");
}

function findScopeIndex(items, classId) {
  if (!Array.isArray(items) || items.length === 0) {
    return -1;
  }
  if (classId) {
    return items.findIndex((item) => String(item.classId) === String(classId));
  }
  return -1;
}

function resolveSelectedScopeOption(data) {
  const scopeOptions = Array.isArray(data.scopeOptions) ? data.scopeOptions : [];
  const selectedScopeIndex = Number(data.selectedScopeIndex || 0);
  const directOption = scopeOptions[selectedScopeIndex];
  const selectedClassId = String((data.selectedClass && data.selectedClass.id) || "").trim();
  if (
    directOption &&
    selectedClassId &&
    String(directOption.classId || "").trim() === selectedClassId
  ) {
    return directOption;
  }

  const matchedIndex = findScopeIndex(scopeOptions, selectedClassId);
  if (matchedIndex >= 0) {
    return scopeOptions[matchedIndex];
  }

  return {};
}

function sortSchoolItems(items) {
  return [...items].sort((a, b) => {
    const sortDiff = resolveSortValue(a) - resolveSortValue(b);
    if (sortDiff !== 0) {
      return sortDiff;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
  });
}

function sortGradeItems(items) {
  return [...items].sort((a, b) => {
    const sortDiff = resolveSortValue(a) - resolveSortValue(b);
    if (sortDiff !== 0) {
      return sortDiff;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
  });
}

function sortClassItems(items) {
  return [...items].sort((a, b) => {
    const sortDiff = resolveSortValue(a) - resolveSortValue(b);
    if (sortDiff !== 0) {
      return sortDiff;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
  });
}

function resolveSortValue(item) {
  const value = Number(item && item.sort);
  return Number.isFinite(value) ? value : 0;
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
