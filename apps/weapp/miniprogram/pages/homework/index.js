const { getSession } = require("../../store/session");
const { getToday, shiftDate } = require("../../utils/date");
const {
  getDailyHomework,
  getHomeworkRecords,
  getStudents,
  saveDailyHomework,
  saveHomeworkRecord,
  uploadImage,
} = require("../../services/records");

const homeworkStatusOptions = [
  { label: "待处理", value: "pending" },
  { label: "已完成", value: "completed" },
  { label: "完成一部分", value: "partial" },
];

Page({
  data: {
    activeRole: "",
    assignmentDraft: null,
    assignments: [],
    canManage: false,
    homeworkEditorDraft: null,
    records: [],
    selectedDate: getToday(),
    selectedStudentId: "",
    statusOptions: homeworkStatusOptions,
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
        assignmentDraft: null,
        assignments: [],
        canManage: false,
        homeworkEditorDraft: null,
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
    const assignments = await getDailyHomework({ serviceDate: selectedDate });
    const records = await getHomeworkRecords({ serviceDate: selectedDate });
    const managerAssignments = buildManagerAssignments(students, assignments);

    if (canManage) {
      const teacherRecords = buildTeacherHomeworkRecords(students, records, assignments);
      this.setData({
        activeRole,
        assignmentDraft: managerAssignments[0] ? { ...managerAssignments[0] } : null,
        assignments: managerAssignments,
        canManage,
        homeworkEditorDraft: teacherRecords[0]
          ? createHomeworkEditorDraft(teacherRecords[0])
          : null,
        records: teacherRecords,
        selectedStudentId: "",
        students,
      });
      return;
    }

    const selectedStudentId =
      this.data.selectedStudentId || (students[0] ? students[0].id : "");
    const visibleAssignments = filterAssignmentsByStudent(
      managerAssignments,
      students,
      selectedStudentId
    );
    const visibleRecords = records
      .filter((item) => item.studentId === selectedStudentId)
      .map((item) => normalizeHomeworkRecord(item, students, assignments));

    this.setData({
      activeRole,
      assignmentDraft: null,
      assignments: visibleAssignments,
      canManage,
      homeworkEditorDraft: null,
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
  handleSelectAssignment(event) {
    const assignmentId = event.currentTarget.dataset.assignmentId;
    const assignment = this.data.assignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      return;
    }

    this.setData({
      assignmentDraft: { ...assignment },
    });
  },
  handleAssignmentContentInput(event) {
    this.setData({
      "assignmentDraft.content": event.detail.value,
    });
  },
  handleAssignmentRemarkInput(event) {
    this.setData({
      "assignmentDraft.remark": event.detail.value,
    });
  },
  async handleSaveAssignment() {
    const draft = this.data.assignmentDraft;
    if (!draft) {
      return;
    }

    try {
      const roleLabel = this.data.activeRole === "admin" ? "管理员端" : "教师端";
      await saveDailyHomework({
        campusId: draft.campusId,
        className: draft.className,
        content: draft.content,
        id: draft.id && draft.id.startsWith("draft-assignment-") ? "" : draft.id,
        remark: draft.remark,
        schoolName: draft.schoolName,
        serviceDate: this.data.selectedDate,
        teacherId: draft.teacherId || "",
        teacherName: draft.teacherName || roleLabel,
      });

      wx.showToast({
        title: "已保存每日作业",
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
  handleSelectHomeworkRecord(event) {
    const recordId = event.currentTarget.dataset.recordId;
    const record = this.data.records.find((item) => item.id === recordId);
    if (!record) {
      return;
    }

    this.setData({
      homeworkEditorDraft: createHomeworkEditorDraft(record),
    });
  },
  handleHomeworkStatusChange(event) {
    const statusIndex = Number(event.detail.value);
    this.setData({
      "homeworkEditorDraft.status": this.data.statusOptions[statusIndex].value,
      "homeworkEditorDraft.statusIndex": statusIndex,
    });
  },
  handleHomeworkRemarkInput(event) {
    this.setData({
      "homeworkEditorDraft.remark": event.detail.value,
    });
  },
  async handleChooseHomeworkImages() {
    if (!this.data.homeworkEditorDraft || this.data.uploadingImages) {
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

      const nextImages = this.data.homeworkEditorDraft.imageUrls.slice();
      for (const filePath of chooseResult.tempFilePaths) {
        const uploaded = await uploadImage({
          filePath,
          purpose: "homework-records",
        });
        nextImages.push(uploaded.url);
      }

      this.setData({
        "homeworkEditorDraft.imageUrls": nextImages,
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
  handleRemoveHomeworkImage(event) {
    const imageUrl = event.currentTarget.dataset.imageUrl;
    this.setData({
      "homeworkEditorDraft.imageUrls": (this.data.homeworkEditorDraft.imageUrls || []).filter(
        (item) => item !== imageUrl
      ),
    });
  },
  async handleSaveHomeworkRecord() {
    const draft = this.data.homeworkEditorDraft;
    if (!draft) {
      return;
    }

    try {
      const roleLabel = this.data.activeRole === "admin" ? "管理员端" : "教师端";
      await saveHomeworkRecord({
        campusId: draft.campusId,
        campusName: draft.campusName,
        className: draft.className,
        id: draft.id,
        imageUrls: draft.imageUrls || [],
        recordedBy: draft.recordedBy || roleLabel,
        recordedById: draft.recordedById || "",
        remark: draft.remark,
        schoolName: draft.schoolName,
        serviceDate: this.data.selectedDate,
        status: draft.status,
        studentId: draft.studentId,
        studentName: draft.studentName,
        subjectSummary: draft.subjectSummary,
      });

      wx.showToast({
        title: "已保存作业反馈",
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

function filterAssignmentsByStudent(assignments, students, studentId) {
  const student = students.find((item) => item.id === studentId);
  if (!student) {
    return [];
  }

  return assignments.filter((item) => {
    return item.schoolName === student.schoolName && item.className === student.className;
  });
}

function buildTeacherHomeworkRecords(students, records, assignments) {
  return students.map((student) => {
    const existing = records.find((item) => item.studentId === student.id);
    return normalizeHomeworkRecord(
      existing || {
        campusId: student.campusId,
        campusName: student.campusName,
        className: student.className,
        id: `draft-homework-${student.id}`,
        recordedBy: "",
        recordedById: "",
        remark: "",
        schoolName: student.schoolName,
        status: "pending",
        studentId: student.id,
        studentName: student.name,
        subjectSummary: "待补充",
      },
      students,
      assignments
    );
  });
}

function buildManagerAssignments(students, assignments) {
  const groupMap = {};

  students.forEach((student) => {
    const key = getAssignmentGroupKey(student);
    if (!key) {
      return;
    }
    groupMap[key] = {
      campusId: student.campusId,
      campusName: student.campusName || "",
      className: student.className,
      content: "",
      id: "",
      remark: "",
      schoolName: student.schoolName,
      serviceDate: "",
      teacherId: "",
      teacherName: "",
    };
  });

  assignments.forEach((assignment) => {
    const key = getAssignmentGroupKey(assignment);
    if (!key) {
      return;
    }
    groupMap[key] = {
      ...(groupMap[key] || {}),
      ...assignment,
    };
  });

  return Object.keys(groupMap).map((key) => {
    const item = groupMap[key];
    return {
      ...item,
      id: item.id || `draft-assignment-${key}`,
      remark: item.remark || "",
    };
  });
}

function getAssignmentGroupKey(item) {
  if (!item || !item.schoolName || !item.className) {
    return "";
  }
  return [item.campusId || "", item.schoolName, item.className].join("::");
}

function normalizeHomeworkRecord(record, students, assignments) {
  const student = students.find((item) => item.id === record.studentId);
  const assignment = assignments.find((item) => {
    return (
      student &&
      item.schoolName === student.schoolName &&
      item.className === student.className
    );
  });
  const statusOption =
    homeworkStatusOptions.find((item) => item.value === record.status) || homeworkStatusOptions[0];

  return {
    assignmentContent: assignment ? assignment.content : "当天作业内容待配置",
    campusId: record.campusId || (student ? student.campusId : ""),
    campusName: record.campusName || (student ? student.campusName : ""),
    className: record.className || (student ? student.className : ""),
    id: record.id,
    imageUrls: Array.isArray(record.imageUrls) ? record.imageUrls : [],
    recordedBy: record.recordedBy || "",
    recordedById: record.recordedById || "",
    remark: record.remark || "暂无反馈",
    schoolName: record.schoolName || (student ? student.schoolName : ""),
    status: statusOption.value,
    statusIndex: homeworkStatusOptions.findIndex(
      (item) => item.value === statusOption.value
    ),
    statusLabel: statusOption.label,
    studentId: record.studentId,
    studentName: record.studentName || (student ? student.name : ""),
    subjectSummary: record.subjectSummary || "待补充",
  };
}

function createHomeworkEditorDraft(record) {
  return {
    campusId: record.campusId,
    campusName: record.campusName,
    className: record.className,
    id: record.id && record.id.startsWith("draft-") ? "" : record.id,
    imageUrls: Array.isArray(record.imageUrls) ? record.imageUrls.slice() : [],
    recordedBy: record.recordedBy,
    recordedById: record.recordedById,
    remark: record.remark === "暂无反馈" ? "" : record.remark,
    schoolName: record.schoolName,
    status: record.status,
    statusIndex: record.statusIndex,
    studentId: record.studentId,
    studentName: record.studentName,
    subjectSummary: record.subjectSummary,
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
