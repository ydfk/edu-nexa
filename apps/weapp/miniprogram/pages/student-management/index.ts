const { getSession } = require("../../store/session");
const { formatDate } = require("../../utils/date");
const {
  getCampuses,
  getStudentServices,
  getStudents,
  saveStudent,
  saveStudentService,
} = require("../../services/records");

const paymentStatusOptions = [
  { label: "已缴费", value: "paid" },
  { label: "待缴费", value: "unpaid" },
  { label: "已暂停", value: "paused" },
];

Page({
  data: {
    activeRole: "",
    activeStudentTab: 0,
    campuses: [],
    campusColumns: [],
    calendarField: "",
    canEdit: false,
    draft: null,
    paymentStatusOptions,
    selectedStudentId: "",
    serviceDraft: null,
    showCampusPicker: false,
    showDateCalendar: false,
    students: [],
  },
  onShow() {
    this.loadPage();
  },
  async loadPage() {
    const session = getSession();
    if (!session.token || !session.user) {
      this.setData({
        activeRole: "",
        activeStudentTab: 0,
        campuses: [],
        campusColumns: [],
        calendarField: "",
        canEdit: false,
        draft: null,
        selectedStudentId: "",
        serviceDraft: null,
        showCampusPicker: false,
        showDateCalendar: false,
        students: [],
      });
      return;
    }

    const activeRole = session.activeRole || (session.user.roles || [])[0] || "";
    const canEdit = activeRole === "teacher" || activeRole === "admin";
    const [campuses, students, plans] = await Promise.all([
      getCampuses({ status: "active" }),
      getStudents({}),
      getStudentServices({}),
    ]);
    const mergedStudents = mergeStudentsWithPlans(students, plans);
    const selectedStudentId = resolveSelectedStudentId(
      this.data.selectedStudentId,
      mergedStudents
    );

    if (!canEdit) {
      this.setData({
        activeRole,
        activeStudentTab: Math.max(
          mergedStudents.findIndex((item) => item.id === selectedStudentId),
          0
        ),
        campuses,
        campusColumns: buildCampusColumns(campuses),
        canEdit,
        draft: null,
        selectedStudentId,
        serviceDraft: null,
        showCampusPicker: false,
        showDateCalendar: false,
        students: mergedStudents,
      });
      return;
    }

    const selectedStudent = mergedStudents.find((item) => item.id === selectedStudentId);
    this.setData({
      activeRole,
      activeStudentTab: Math.max(
        mergedStudents.findIndex((item) => item.id === selectedStudentId),
        0
      ),
      campuses,
      campusColumns: buildCampusColumns(campuses),
      calendarField: "",
      canEdit,
      draft: createStudentDraft(selectedStudent, campuses),
      selectedStudentId,
      serviceDraft: createServiceDraft(selectedStudent),
      showCampusPicker: false,
      showDateCalendar: false,
      students: mergedStudents,
    });
  },
  handleStudentTabChange(event) {
    const tabIndex = Number(event.detail.index || 0);
    const student = this.data.students[tabIndex];
    if (!student) {
      return;
    }

    if (!this.data.canEdit) {
      this.setData({
        activeStudentTab: tabIndex,
        selectedStudentId: student.id,
      });
      return;
    }

    this.setData({
      activeStudentTab: tabIndex,
      draft: createStudentDraft(student, this.data.campuses),
      selectedStudentId: student.id,
      serviceDraft: createServiceDraft(student),
    });
  },
  handleSelectStudent(event) {
    const studentId = event.currentTarget.dataset.studentId;
    const student = this.data.students.find((item) => item.id === studentId);
    this.setData({
      activeStudentTab: Math.max(
        this.data.students.findIndex((item) => item.id === studentId),
        0
      ),
      draft: createStudentDraft(student, this.data.campuses),
      selectedStudentId: studentId,
      serviceDraft: createServiceDraft(student),
    });
  },
  handleCreateStudent() {
    this.setData({
      activeStudentTab: 0,
      draft: createStudentDraft(null, this.data.campuses),
      selectedStudentId: "",
      serviceDraft: createServiceDraft(null),
    });
  },
  handleFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`draft.${field}`]: event.detail,
    });
  },
  handleOpenCampusPicker() {
    this.setData({
      showCampusPicker: true,
    });
  },
  handleCloseCampusPicker() {
    this.setData({
      showCampusPicker: false,
    });
  },
  handleCampusChange(event) {
    const campusIndex = Number(event.detail.value);
    const campus = this.data.campuses[campusIndex];
    this.setData({
      "draft.campusId": campus ? campus.id : "",
      "draft.campusIndex": campusIndex,
    });
  },
  handleConfirmCampus(event) {
    const value = Array.isArray(event.detail.value) ? event.detail.value[0] : event.detail.value;
    const campusId = value ? value.value || value.id || "" : "";
    const campusIndex = this.data.campuses.findIndex((item) => item.id === campusId);
    const campus = this.data.campuses[campusIndex];

    this.setData({
      "draft.campusId": campus ? campus.id : "",
      "draft.campusIndex": campusIndex >= 0 ? campusIndex : 0,
      showCampusPicker: false,
    });
  },
  handlePaymentStatusChange(event) {
    const paymentStatus = event.detail || event.currentTarget.dataset.name || "";
    const paymentStatusIndex = paymentStatusOptions.findIndex(
      (item) => item.value === paymentStatus
    );
    if (paymentStatusIndex < 0) {
      return;
    }
    this.setData({
      "serviceDraft.paymentStatus": paymentStatusOptions[paymentStatusIndex].value,
      "serviceDraft.paymentStatusIndex": paymentStatusIndex,
    });
  },
  handlePaymentStatusTap(event) {
    const paymentStatus = event.currentTarget.dataset.status;
    const paymentStatusIndex = paymentStatusOptions.findIndex(
      (item) => item.value === paymentStatus
    );
    if (!this.data.serviceDraft || paymentStatusIndex < 0) {
      return;
    }

    this.setData({
      "serviceDraft.paymentStatus": paymentStatus,
      "serviceDraft.paymentStatusIndex": paymentStatusIndex,
    });
  },
  handleServiceFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`serviceDraft.${field}`]: event.detail,
    });
  },
  handleOpenDateCalendar(event) {
    this.setData({
      calendarField: event.currentTarget.dataset.field,
      showDateCalendar: true,
    });
  },
  handleCloseDateCalendar() {
    this.setData({
      calendarField: "",
      showDateCalendar: false,
    });
  },
  handleConfirmDate(event) {
    if (!this.data.calendarField) {
      return;
    }

    this.setData({
      [`serviceDraft.${this.data.calendarField}`]: formatDate(event.detail),
      calendarField: "",
      showDateCalendar: false,
    });
  },
  handleServiceDateChange(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`serviceDraft.${field}`]: event.detail.value,
    });
  },
  async handleSave() {
    const { draft, serviceDraft } = this.data;
    if (!draft || !serviceDraft) {
      return;
    }
    if (!draft.name || !draft.campusId) {
      wx.showToast({
        title: "请先填写学生姓名和校区",
        icon: "none",
      });
      return;
    }

    try {
      const savedStudent = await saveStudent({
        campusId: draft.campusId,
        className: draft.className,
        grade: draft.grade,
        guardianName: draft.guardianName,
        guardianPhone: draft.guardianPhone,
        id: draft.id,
        name: draft.name,
        schoolName: draft.schoolName,
        status: draft.status,
      });

      await saveStudentService({
        campusId: draft.campusId,
        id: serviceDraft.id,
        paidAt: serviceDraft.paidAt,
        paymentStatus: serviceDraft.paymentStatus,
        remark: serviceDraft.remark,
        serviceEndDate: serviceDraft.serviceEndDate,
        serviceStartDate: serviceDraft.serviceStartDate,
        studentId: savedStudent.id || draft.id,
      });

      wx.showToast({
        title: "已保存学生信息",
        icon: "success",
      });
      this.setData({
        selectedStudentId: savedStudent.id || draft.id || "",
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

function resolveSelectedStudentId(selectedStudentId, students) {
  if (selectedStudentId && students.some((item) => item.id === selectedStudentId)) {
    return selectedStudentId;
  }
  return students[0] ? students[0].id : "";
}

function mergeStudentsWithPlans(students, plans) {
  const planMap = {};
  plans.forEach((item) => {
    if (!item.studentId || planMap[item.studentId]) {
      return;
    }
    planMap[item.studentId] = item;
  });

  return students.map((student) => {
    const plan = planMap[student.id];
    if (!plan) {
      return student;
    }

    return {
      ...student,
      serviceSummary: {
        paidAt: plan.paidAt,
        paymentStatus: plan.paymentStatus,
        remark: plan.remark,
        serviceEndDate: plan.serviceEndDate,
        serviceStartDate: plan.serviceStartDate,
      },
      servicePlanId: plan.id,
    };
  });
}

function createStudentDraft(student, campuses) {
  const campusIndex = campuses.findIndex((item) => item.id === (student ? student.campusId : ""));
  const nextCampusIndex = campusIndex >= 0 ? campusIndex : 0;
  const nextCampus = campuses[nextCampusIndex];

  return {
    campusId: student ? student.campusId : nextCampus ? nextCampus.id : "",
    campusIndex: nextCampusIndex,
    className: student ? student.className : "",
    grade: student ? student.grade : "",
    guardianName: student ? student.guardianName : "",
    guardianPhone: student ? student.guardianPhone : "",
    id: student ? student.id : "",
    name: student ? student.name : "",
    schoolName: student ? student.schoolName : "",
    status: student ? student.status : "active",
  };
}

function createServiceDraft(student) {
  const serviceSummary = student && student.serviceSummary ? student.serviceSummary : {};
  const paymentStatus = serviceSummary.paymentStatus || "unpaid";
  const paymentStatusIndex = paymentStatusOptions.findIndex((item) => item.value === paymentStatus);

  return {
    id: student ? student.servicePlanId || "" : "",
    paidAt: serviceSummary.paidAt || "",
    paymentStatus,
    paymentStatusIndex: paymentStatusIndex >= 0 ? paymentStatusIndex : 1,
    remark: serviceSummary.remark || "",
    serviceEndDate: serviceSummary.serviceEndDate || "",
    serviceStartDate: serviceSummary.serviceStartDate || "",
  };
}

function buildCampusColumns(campuses) {
  return campuses.map((campus) => ({
    text: campus.name,
    value: campus.id,
  }));
}
