const { getSession } = require("../../store/session");
const { formatDate, getToday, shiftDate } = require("../../utils/date");
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
    activeAssignmentTab: 0,
    activeRole: "",
    activeStudentTab: 0,
    assignmentDraft: null,
    assignments: [],
    canManage: false,
    currentAssignment: null,
    currentRecord: null,
    homeworkEditorDraft: null,
    managerMode: "assignment",
    records: [],
    selectedAssignmentId: "",
    selectedDate: getToday(),
    selectedStudentId: "",
    showDateCalendar: false,
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
      this.resetPage();
      return;
    }

    const activeRole = session.activeRole || (session.user.roles || [])[0] || "guardian";
    const canManage = activeRole === "teacher" || activeRole === "admin";
    const students = await getStudents(
      activeRole === "guardian" ? { guardianPhone: session.user.phone } : {}
    );
    const sourceAssignments = await getDailyHomework({ serviceDate: this.data.selectedDate });
    const assignments = buildManagerAssignments(students, sourceAssignments);
    const sourceRecords = await getHomeworkRecords({ serviceDate: this.data.selectedDate });
    const records = buildHomeworkRecords(students, sourceRecords, assignments);
    const selectionState = canManage
      ? buildManagerSelectionState({
          assignments,
          records,
          selectedAssignmentId: this.data.selectedAssignmentId,
          selectedStudentId: this.data.selectedStudentId,
          students,
        })
      : buildViewerSelectionState({
          assignments,
          records,
          selectedStudentId: this.data.selectedStudentId,
          students,
        });

    this.setData({
      activeRole,
      assignments,
      canManage,
      records,
      showDateCalendar: false,
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
  handleManagerModeChange(event) {
    this.setData({
      managerMode: event.detail.name,
    });
  },
  handleAssignmentTabChange(event) {
    const tabIndex = Number(event.detail.index || 0);
    const assignment = this.data.assignments[tabIndex];
    if (!assignment) {
      return;
    }

    this.setData(
      buildManagerSelectionState({
        assignments: this.data.assignments,
        records: this.data.records,
        selectedAssignmentId: assignment.id,
        selectedStudentId: this.data.selectedStudentId,
        students: this.data.students,
      })
    );
  },
  handleStudentTabChange(event) {
    const tabIndex = Number(event.detail.index || 0);
    const student = this.data.students[tabIndex];
    if (!student) {
      return;
    }

    const selectionState = this.data.canManage
      ? buildManagerSelectionState({
          assignments: this.data.assignments,
          records: this.data.records,
          selectedAssignmentId: this.data.selectedAssignmentId,
          selectedStudentId: student.id,
          students: this.data.students,
        })
      : buildViewerSelectionState({
          assignments: this.data.assignments,
          records: this.data.records,
          selectedStudentId: student.id,
          students: this.data.students,
        });

    this.setData(selectionState);
  },
  handleAssignmentContentInput(event) {
    this.setData({
      "assignmentDraft.content": event.detail,
    });
  },
  handleAssignmentRemarkInput(event) {
    this.setData({
      "assignmentDraft.remark": event.detail,
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
  handleHomeworkStatusChange(event) {
    const status = event.detail || event.currentTarget.dataset.name || "";
    const statusIndex = homeworkStatusOptions.findIndex((item) => item.value === status);
    if (!this.data.homeworkEditorDraft || statusIndex < 0) {
      return;
    }

    this.setData({
      "homeworkEditorDraft.status": status,
      "homeworkEditorDraft.statusIndex": statusIndex,
    });
  },
  handleHomeworkRemarkInput(event) {
    this.setData({
      "homeworkEditorDraft.remark": event.detail,
    });
  },
  async handleAfterReadImage(event) {
    if (!this.data.homeworkEditorDraft || this.data.uploadingImages) {
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

      const nextImageUrls = (this.data.homeworkEditorDraft.imageUrls || []).slice();
      const nextFileList = (this.data.homeworkEditorDraft.fileList || []).slice();

      for (const file of files) {
        const uploaded = await uploadImage({
          filePath: file.url,
          purpose: "homework-records",
        });
        nextImageUrls.push(uploaded.url);
        nextFileList.push({
          name: "图片",
          url: uploaded.url,
        });
      }

      this.setData({
        "homeworkEditorDraft.fileList": nextFileList,
        "homeworkEditorDraft.imageUrls": nextImageUrls,
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
    if (!this.data.homeworkEditorDraft) {
      return;
    }

    const index = Number(event.detail.index || 0);
    const nextImageUrls = (this.data.homeworkEditorDraft.imageUrls || []).slice();
    const nextFileList = (this.data.homeworkEditorDraft.fileList || []).slice();

    nextImageUrls.splice(index, 1);
    nextFileList.splice(index, 1);

    this.setData({
      "homeworkEditorDraft.fileList": nextFileList,
      "homeworkEditorDraft.imageUrls": nextImageUrls,
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
      activeAssignmentTab: 0,
      activeRole: "",
      activeStudentTab: 0,
      assignmentDraft: null,
      assignments: [],
      canManage: false,
      currentAssignment: null,
      currentRecord: null,
      homeworkEditorDraft: null,
      records: [],
      selectedAssignmentId: "",
      selectedStudentId: "",
      showDateCalendar: false,
      students: [],
    });
  },
});

function buildViewerSelectionState(options) {
  const selectedStudentId = getDefaultStudentId(options.selectedStudentId, options.students);
  const currentStudent =
    options.students.find((item) => item.id === selectedStudentId) || options.students[0];
  const currentAssignment =
    filterAssignmentsByStudent(options.assignments, currentStudent)[0] || null;
  const currentRecord =
    options.records.find((item) => item.studentId === selectedStudentId) ||
    options.records[0] ||
    null;

  return {
    activeAssignmentTab: 0,
    activeStudentTab: Math.max(
      options.students.findIndex((item) => item.id === selectedStudentId),
      0
    ),
    assignmentDraft: null,
    currentAssignment,
    currentRecord,
    homeworkEditorDraft: null,
    selectedAssignmentId: currentAssignment ? currentAssignment.id : "",
    selectedStudentId: currentRecord ? currentRecord.studentId : "",
  };
}

function buildManagerSelectionState(options) {
  const selectedAssignmentId = getDefaultAssignmentId(
    options.selectedAssignmentId,
    options.assignments
  );
  const selectedStudentId = getDefaultStudentId(options.selectedStudentId, options.students);
  const currentAssignment =
    options.assignments.find((item) => item.id === selectedAssignmentId) ||
    options.assignments[0] ||
    null;
  const currentRecord =
    options.records.find((item) => item.studentId === selectedStudentId) ||
    options.records[0] ||
    null;

  return {
    activeAssignmentTab: Math.max(
      options.assignments.findIndex((item) => item.id === selectedAssignmentId),
      0
    ),
    activeStudentTab: Math.max(
      options.students.findIndex((item) => item.id === selectedStudentId),
      0
    ),
    assignmentDraft: currentAssignment ? { ...currentAssignment } : null,
    currentAssignment,
    currentRecord,
    homeworkEditorDraft: currentRecord ? createHomeworkEditorDraft(currentRecord) : null,
    selectedAssignmentId: currentAssignment ? currentAssignment.id : "",
    selectedStudentId: currentRecord ? currentRecord.studentId : "",
  };
}

function filterAssignmentsByStudent(assignments, student) {
  if (!student) {
    return [];
  }

  return assignments.filter((item) => {
    return item.schoolName === student.schoolName && item.className === student.className;
  });
}

function buildHomeworkRecords(students, records, assignments) {
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
        subjectSummary: "",
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
    const existing = groupMap[key];
    groupMap[key] = {
      campusId: student.campusId,
      campusName: student.campusName || "",
      className: student.className,
      content: "",
      id: "",
      remark: "",
      schoolName: student.schoolName,
      serviceDate: "",
      studentCount: existing ? existing.studentCount + 1 : 1,
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
      studentCount: groupMap[key] ? groupMap[key].studentCount : 0,
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

function getDefaultAssignmentId(selectedAssignmentId, assignments) {
  if (selectedAssignmentId && assignments.some((item) => item.id === selectedAssignmentId)) {
    return selectedAssignmentId;
  }
  return assignments[0] ? assignments[0].id : "";
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
  const imageUrls = Array.isArray(record.imageUrls) ? record.imageUrls : [];

  return {
    assignmentContent: assignment ? assignment.content : "",
    assignmentRemark: assignment ? assignment.remark || "" : "",
    campusId: record.campusId || (student ? student.campusId : ""),
    campusName: record.campusName || (student ? student.campusName : ""),
    className: record.className || (student ? student.className : ""),
    fileList: createFileList(imageUrls),
    id: record.id,
    imageUrls,
    recordedBy: record.recordedBy || "",
    recordedById: record.recordedById || "",
    remark: record.remark || "",
    schoolName: record.schoolName || (student ? student.schoolName : ""),
    status: statusOption.value,
    statusIndex: homeworkStatusOptions.findIndex(
      (item) => item.value === statusOption.value
    ),
    statusLabel: statusOption.label,
    studentId: record.studentId,
    studentName: record.studentName || (student ? student.name : ""),
    subjectSummary: record.subjectSummary || "",
  };
}

function createHomeworkEditorDraft(record) {
  return {
    campusId: record.campusId,
    campusName: record.campusName,
    className: record.className,
    fileList: createFileList(record.imageUrls),
    id: record.id && record.id.startsWith("draft-") ? "" : record.id,
    imageUrls: Array.isArray(record.imageUrls) ? record.imageUrls.slice() : [],
    recordedBy: record.recordedBy,
    recordedById: record.recordedById,
    remark: record.remark || "",
    schoolName: record.schoolName,
    status: record.status,
    statusIndex: record.statusIndex,
    studentId: record.studentId,
    studentName: record.studentName,
    subjectSummary: record.subjectSummary,
  };
}
