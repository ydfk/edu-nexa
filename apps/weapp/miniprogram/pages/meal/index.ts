const { getSession } = require("../../store/session");
const { formatDate, getToday, shiftDate } = require("../../utils/date");
const {
  getMealRecords,
  getStudents,
  saveMealRecord,
  uploadImage,
} = require("../../services/records");

const mealStatusOptions = [
  { label: "待处理", value: "pending" },
  { label: "已完成", value: "completed" },
  { label: "请假", value: "leave" },
];

Page({
  data: {
    activeRole: "",
    activeStudentTab: 0,
    canManage: false,
    currentRecord: null,
    currentStudent: null,
    editorDraft: null,
    records: [],
    selectedDate: getToday(),
    selectedStudentId: "",
    showDateCalendar: false,
    stats: [],
    statusOptions: mealStatusOptions,
    students: [],
    uploadingImages: false,
  },
  onShow() {
    this.loadPage();
  },
  async loadPage() {
    const session = getSession();
    if (!session.token || !session.user) {
      this.resetPage();
      return;
    }

    const activeRole = session.activeRole || (session.user.roles || [])[0] || "guardian";
    const canManage = activeRole === "teacher" || activeRole === "admin";
    const students = await getStudents(
      activeRole === "guardian" ? { guardianPhone: session.user.phone } : {}
    );
    const sourceRecords = await getMealRecords({ serviceDate: this.data.selectedDate });
    const records = buildMealRecords(students, sourceRecords);
    const selectionState = buildSelectionState({
      canManage,
      records,
      selectedStudentId: this.data.selectedStudentId,
      students,
    });

    this.setData({
      activeRole,
      canManage,
      records,
      showDateCalendar: false,
      stats: buildMealStats(records),
      students,
      ...selectionState,
    });
  },
  handleShiftDate(event) {
    const offset = Number(event.currentTarget.dataset.offset || 0);
    this.setData({
      selectedDate: shiftDate(this.data.selectedDate, offset),
    });
    this.loadPage();
  },
  handleOpenDateCalendar() {
    this.setData({
      showDateCalendar: true,
    });
  },
  handleCloseDateCalendar() {
    this.setData({
      showDateCalendar: false,
    });
  },
  handleConfirmDate(event) {
    this.setData({
      selectedDate: formatDate(event.detail),
      showDateCalendar: false,
    });
    this.loadPage();
  },
  handleStudentTabChange(event) {
    const tabIndex = Number(event.detail.index || 0);
    const student = this.data.students[tabIndex];
    if (!student) {
      return;
    }

    const selectionState = buildSelectionState({
      canManage: this.data.canManage,
      records: this.data.records,
      selectedStudentId: student.id,
      students: this.data.students,
    });

    this.setData(selectionState);
  },
  handleMealStatusChange(event) {
    const status = event.detail || event.currentTarget.dataset.name || "";
    const statusIndex = mealStatusOptions.findIndex((item) => item.value === status);
    if (!this.data.editorDraft || statusIndex < 0) {
      return;
    }

    this.setData({
      "editorDraft.status": status,
      "editorDraft.statusIndex": statusIndex,
    });
  },
  handleMealRemarkInput(event) {
    this.setData({
      "editorDraft.remark": event.detail,
    });
  },
  async handleAfterReadImage(event) {
    if (!this.data.editorDraft || this.data.uploadingImages) {
      return;
    }

    const files = Array.isArray(event.detail.file) ? event.detail.file : [event.detail.file];
    if (!files.length) {
      return;
    }

    try {
      this.setData({
        uploadingImages: true,
      });

      const nextImageUrls = (this.data.editorDraft.imageUrls || []).slice();
      const nextFileList = (this.data.editorDraft.fileList || []).slice();

      for (const file of files) {
        const uploaded = await uploadImage({
          filePath: file.url,
          purpose: "meal-records",
        });
        nextImageUrls.push(uploaded.url);
        nextFileList.push({
          name: "图片",
          url: uploaded.url,
        });
      }

      this.setData({
        "editorDraft.fileList": nextFileList,
        "editorDraft.imageUrls": nextImageUrls,
      });
    } catch (error) {
      wx.showToast({
        title: "上传失败",
        icon: "none",
      });
    } finally {
      this.setData({
        uploadingImages: false,
      });
    }
  },
  handleDeleteImage(event) {
    if (!this.data.editorDraft) {
      return;
    }

    const index = Number(event.detail.index || 0);
    const nextImageUrls = (this.data.editorDraft.imageUrls || []).slice();
    const nextFileList = (this.data.editorDraft.fileList || []).slice();

    nextImageUrls.splice(index, 1);
    nextFileList.splice(index, 1);

    this.setData({
      "editorDraft.fileList": nextFileList,
      "editorDraft.imageUrls": nextImageUrls,
    });
  },
  async handleSaveRecord() {
    const draft = this.data.editorDraft;
    if (!draft) {
      return;
    }

    try {
      const roleLabel = this.data.activeRole === "admin" ? "管理员端" : "教师端";
      await saveMealRecord({
        campusId: draft.campusId,
        campusName: draft.campusName,
        id: draft.id,
        imageUrls: draft.imageUrls || [],
        recordedBy: draft.recordedBy || roleLabel,
        recordedById: draft.recordedById || "",
        remark: draft.remark,
        serviceDate: this.data.selectedDate,
        status: draft.status,
        studentId: draft.studentId,
        studentName: draft.studentName,
      });

      wx.showToast({
        title: "已保存",
        icon: "success",
      });
      this.loadPage();
    } catch (error) {
      wx.showToast({
        title: "保存失败",
        icon: "none",
      });
    }
  },
  resetPage() {
    this.setData({
      activeRole: "",
      activeStudentTab: 0,
      canManage: false,
      currentRecord: null,
      currentStudent: null,
      editorDraft: null,
      records: [],
      selectedStudentId: "",
      showDateCalendar: false,
      stats: [],
      students: [],
    });
  },
});

function buildMealRecords(students, records) {
  return students.map((student) => {
    const existing = records.find((item) => item.studentId === student.id);
    return normalizeMealRecord(
      existing || {
        campusId: student.campusId,
        campusName: student.campusName,
        id: `draft-meal-${student.id}`,
        imageUrls: [],
        remark: "",
        status: "pending",
        studentId: student.id,
        studentName: student.name,
      },
      students
    );
  });
}

function buildSelectionState(options) {
  const selectedStudentId = getDefaultStudentId(
    options.selectedStudentId,
    options.students
  );
  const currentRecord =
    options.records.find((item) => item.studentId === selectedStudentId) ||
    options.records[0] ||
    null;
  const currentStudent =
    options.students.find((item) => item.id === selectedStudentId) ||
    options.students[0] ||
    null;

  return {
    activeStudentTab: Math.max(
      options.students.findIndex((item) => item.id === selectedStudentId),
      0
    ),
    currentRecord,
    currentStudent,
    editorDraft:
      options.canManage && currentRecord ? createMealEditorDraft(currentRecord) : null,
    selectedStudentId: currentRecord ? currentRecord.studentId : "",
  };
}

function buildMealStats(records) {
  const completedCount = records.filter((item) => item.status === "completed").length;
  const pendingCount = records.filter((item) => item.status === "pending").length;
  const leaveCount = records.filter((item) => item.status === "leave").length;

  return [
    { label: "已完成", value: String(completedCount) },
    { label: "待处理", value: String(pendingCount) },
    { label: "请假", value: String(leaveCount) },
  ];
}

function getDefaultStudentId(selectedStudentId, students) {
  if (selectedStudentId && students.some((item) => item.id === selectedStudentId)) {
    return selectedStudentId;
  }
  return students[0] ? students[0].id : "";
}

function createFileList(imageUrls) {
  return (imageUrls || []).map((url) => ({
    name: "图片",
    url,
  }));
}

function normalizeMealRecord(record, students) {
  const student = students.find((item) => item.id === record.studentId);
  const statusOption =
    mealStatusOptions.find((item) => item.value === record.status) || mealStatusOptions[0];
  const imageUrls = Array.isArray(record.imageUrls) ? record.imageUrls : [];

  return {
    campusId: record.campusId || (student ? student.campusId : ""),
    campusName: record.campusName || (student ? student.campusName : ""),
    fileList: createFileList(imageUrls),
    id: record.id,
    imageUrls,
    recordedBy: record.recordedBy || "",
    recordedById: record.recordedById || "",
    remark: record.remark || "",
    schoolInfo: student ? `${student.schoolName} · ${student.className}` : "",
    status: statusOption.value,
    statusIndex: mealStatusOptions.findIndex((item) => item.value === statusOption.value),
    statusLabel: statusOption.label,
    studentId: record.studentId,
    studentName: record.studentName || (student ? student.name : ""),
  };
}

function createMealEditorDraft(record) {
  return {
    campusId: record.campusId,
    campusName: record.campusName,
    fileList: createFileList(record.imageUrls),
    id: record.id && record.id.startsWith("draft-") ? "" : record.id,
    imageUrls: Array.isArray(record.imageUrls) ? record.imageUrls.slice() : [],
    recordedBy: record.recordedBy || "",
    recordedById: record.recordedById || "",
    remark: record.remark || "",
    status: record.status,
    statusIndex: record.statusIndex,
    studentId: record.studentId,
    studentName: record.studentName,
  };
}
