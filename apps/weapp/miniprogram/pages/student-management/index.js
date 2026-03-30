const { getSession } = require("../../store/session");
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
    campuses: [],
    canEdit: false,
    draft: null,
    paymentStatusOptions,
    selectedStudentId: "",
    serviceDraft: null,
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
        campuses: [],
        canEdit: false,
        draft: null,
        selectedStudentId: "",
        serviceDraft: null,
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
        campuses,
        canEdit,
        draft: null,
        selectedStudentId,
        serviceDraft: null,
        students: mergedStudents,
      });
      return;
    }

    const selectedStudent = mergedStudents.find((item) => item.id === selectedStudentId);
    this.setData({
      activeRole,
      campuses,
      canEdit,
      draft: createStudentDraft(selectedStudent, campuses),
      selectedStudentId,
      serviceDraft: createServiceDraft(selectedStudent),
      students: mergedStudents,
    });
  },
  handleSelectStudent(event) {
    const studentId = event.currentTarget.dataset.studentId;
    const student = this.data.students.find((item) => item.id === studentId);
    this.setData({
      draft: createStudentDraft(student, this.data.campuses),
      selectedStudentId: studentId,
      serviceDraft: createServiceDraft(student),
    });
  },
  handleCreateStudent() {
    this.setData({
      draft: createStudentDraft(null, this.data.campuses),
      selectedStudentId: "",
      serviceDraft: createServiceDraft(null),
    });
  },
  handleFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`draft.${field}`]: event.detail.value,
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
  handlePaymentStatusChange(event) {
    const paymentStatusIndex = Number(event.detail.value);
    this.setData({
      "serviceDraft.paymentStatus": paymentStatusOptions[paymentStatusIndex].value,
      "serviceDraft.paymentStatusIndex": paymentStatusIndex,
    });
  },
  handleServiceFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`serviceDraft.${field}`]: event.detail.value,
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
