const { getSession } = require("../../store/session");
const { getToday, shiftDate } = require("../../utils/date");
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
    canManage: false,
    editorDraft: null,
    records: [],
    selectedDate: getToday(),
    selectedStudentId: "",
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
      this.setData({
        activeRole: "",
        canManage: false,
        editorDraft: null,
        records: [],
        selectedStudentId: "",
        students: [],
      });
      return;
    }

    const activeRole = session.activeRole || (session.user.roles || [])[0] || "guardian";
    const canManage = activeRole === "teacher" || activeRole === "admin";
    const selectedDate = this.data.selectedDate;
    const students = await getStudents(
      activeRole === "guardian" ? { guardianPhone: session.user.phone } : {}
    );
    const records = await getMealRecords({ serviceDate: selectedDate });

    if (canManage) {
      const teacherRecords = buildTeacherMealRecords(students, records);
      this.setData({
        activeRole,
        canManage,
        editorDraft: teacherRecords[0] ? createMealEditorDraft(teacherRecords[0]) : null,
        records: teacherRecords,
        selectedStudentId: "",
        students,
      });
      return;
    }

    const selectedStudentId =
      this.data.selectedStudentId || (students[0] ? students[0].id : "");
    const visibleRecords = records
      .filter((item) => item.studentId === selectedStudentId)
      .map((item) => normalizeMealRecord(item, students));

    this.setData({
      activeRole,
      canManage,
      editorDraft: null,
      records: visibleRecords,
      selectedStudentId,
      students,
    });
  },
  handleShiftDate(event) {
    const offset = Number(event.currentTarget.dataset.offset || 0);
    this.setData({
      selectedDate: shiftDate(this.data.selectedDate, offset),
    });
    this.loadPage();
  },
  handleSelectStudent(event) {
    this.setData({
      selectedStudentId: event.currentTarget.dataset.studentId,
    });
    this.loadPage();
  },
  handleSelectTeacherRecord(event) {
    const recordId = event.currentTarget.dataset.recordId;
    const record = this.data.records.find((item) => item.id === recordId);
    if (!record) {
      return;
    }

    this.setData({
      editorDraft: createMealEditorDraft(record),
    });
  },
  handleMealStatusChange(event) {
    const statusIndex = Number(event.detail.value);
    this.setData({
      "editorDraft.status": this.data.statusOptions[statusIndex].value,
      "editorDraft.statusIndex": statusIndex,
    });
  },
  handleMealRemarkInput(event) {
    this.setData({
      "editorDraft.remark": event.detail.value,
    });
  },
  async handleChooseImages() {
    if (!this.data.editorDraft || this.data.uploadingImages) {
      return;
    }

    try {
      const chooseResult = await wxChooseImage();
      if (!chooseResult.tempFilePaths.length) {
        return;
      }

      this.setData({
        uploadingImages: true,
      });

      const nextImages = this.data.editorDraft.imageUrls.slice();
      for (const filePath of chooseResult.tempFilePaths) {
        const uploaded = await uploadImage({
          filePath,
          purpose: "meal-records",
        });
        nextImages.push(uploaded.url);
      }

      this.setData({
        "editorDraft.imageUrls": nextImages,
      });
    } catch (error) {
      wx.showToast({
        title: "上传图片失败",
        icon: "none",
      });
    } finally {
      this.setData({
        uploadingImages: false,
      });
    }
  },
  handleRemoveImage(event) {
    const imageUrl = event.currentTarget.dataset.imageUrl;
    this.setData({
      "editorDraft.imageUrls": (this.data.editorDraft.imageUrls || []).filter(
        (item) => item !== imageUrl
      ),
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
        title: "已保存用餐记录",
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
});

function buildTeacherMealRecords(students, records) {
  return students.map((student) => {
    const existing = records.find((item) => item.studentId === student.id);
    return normalizeMealRecord(
      existing || {
        campusId: student.campusId,
        campusName: student.campusName,
        id: `draft-meal-${student.id}`,
        remark: "",
        status: "pending",
        studentId: student.id,
        studentName: student.name,
      },
      students
    );
  });
}

function normalizeMealRecord(record, students) {
  const student = students.find((item) => item.id === record.studentId);
  const statusOption =
    mealStatusOptions.find((item) => item.value === record.status) || mealStatusOptions[0];

  return {
    campusId: record.campusId || (student ? student.campusId : ""),
    campusName: record.campusName || (student ? student.campusName : ""),
    id: record.id,
    imageUrls: Array.isArray(record.imageUrls) ? record.imageUrls : [],
    recordedBy: record.recordedBy || "",
    recordedById: record.recordedById || "",
    remark: record.remark || "暂无备注",
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
    id: record.id && record.id.startsWith("draft-") ? "" : record.id,
    imageUrls: Array.isArray(record.imageUrls) ? record.imageUrls.slice() : [],
    recordedBy: record.recordedBy || "",
    recordedById: record.recordedById || "",
    remark: record.remark === "暂无备注" ? "" : record.remark,
    status: record.status,
    statusIndex: record.statusIndex,
    studentId: record.studentId,
    studentName: record.studentName,
  };
}

function wxChooseImage() {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 3,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: resolve,
      fail: reject,
    });
  });
}
