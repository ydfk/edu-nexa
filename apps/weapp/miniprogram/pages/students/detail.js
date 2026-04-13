const { getStudents, saveStudent } = require("../../services/records");
const { getSchools, getGrades, getClasses } = require("../../services/schools");
const { getGuardians } = require("../../services/guardians");
const { requireEditor } = require("../../utils/permission");
const Dialog = require("@vant/weapp/dialog/dialog").default;

Page({
  data: {
    isEdit: false,
    studentId: "",
    gender: "",
    name: "",
    status: "active",
    submitting: false,

    selectedSchool: {},
    selectedGrade: {},
    selectedClass: {},
    selectedGuardian: {},

    schools: [],
    grades: [],
    classes: [],
    guardians: [],

    schoolColumns: [],
    gradeColumns: [],
    classColumns: [],
    guardianColumns: [],

    showSchoolPicker: false,
    showGradePicker: false,
    showClassPicker: false,
    showGuardianPicker: false,
  },

  onLoad(options) {
    if (!requireEditor()) return;
    this.setData({ isEdit: !!options.id, studentId: options.id || "" });
    this.loadSchools();
    this.loadGuardians();
    if (options.id) this.loadStudent(options.id);
  },

  async loadStudent(id) {
    try {
      const res = await getStudents({ id });
      const list = res.items || res || [];
      const student = Array.isArray(list) ? list.find((s) => String(s.id) === String(id)) : list;
      if (!student) return;
      this.setData({
        gender: student.gender || "",
        name: student.name || "",
        status: student.status || "active",
        selectedSchool: { id: student.schoolId, name: student.schoolName },
        selectedGrade: { id: student.gradeId, name: student.gradeName || student.grade },
        selectedClass: { id: student.classId, name: buildClassLabel(student.gradeName || student.grade, student.className) },
        selectedGuardian: { id: student.guardianId, name: student.guardianName },
      });
      if (student.schoolId) this.loadGrades(student.schoolId);
      if (student.gradeId) this.loadClasses(student.gradeId);
    } catch (e) {
      console.warn("加载学生信息失败", e);
    }
  },

  async loadSchools() {
    try {
      const res = await getSchools();
      const list = res.items || res || [];
      const nextData = {
        schools: list,
        schoolColumns: list.map((s) => ({ text: s.name, value: s.id })),
      };
      if (!this.data.isEdit && !this.data.selectedSchool.id && list.length === 1) {
        const [school] = list;
        nextData.selectedSchool = { id: school.id, name: school.name };
      }
      this.setData(nextData);
      if (!this.data.isEdit && !this.data.selectedSchool.id && list.length === 1) {
        this.loadGrades(list[0].id);
      }
    } catch (e) {
      console.warn("加载学校失败", e);
    }
  },

  async loadGrades(schoolId) {
    if (!schoolId) {
      this.setData({
        grades: [],
        classes: [],
        gradeColumns: [],
        classColumns: [],
        selectedGrade: {},
        selectedClass: {},
      });
      return;
    }

    try {
      const res = await getGrades({ schoolId });
      const list = res.items || res || [];
      const nextData = {
        grades: list,
        gradeColumns: list.map((g) => ({ text: g.name, value: g.id })),
      };
      if (!this.data.selectedGrade.id && list.length === 1) {
        const [grade] = list;
        nextData.selectedGrade = { id: grade.id, name: grade.name };
        nextData.selectedClass = {};
        nextData.classColumns = [];
      }
      this.setData(nextData);
      if (!this.data.selectedGrade.id && list.length === 1) {
        this.loadClasses(list[0].id);
      }
    } catch (e) {
      console.warn("加载年级失败", e);
    }
  },

  async loadClasses(gradeId) {
    if (!gradeId) {
      this.setData({
        classes: [],
        classColumns: [],
        selectedClass: {},
      });
      return;
    }

    try {
      const res = await getClasses({ gradeId });
      const list = res.items || res || [];
      const nextData = {
        classes: list,
        classColumns: list.map((c) => ({ text: buildClassLabel(this.data.selectedGrade.name, c.name), value: c.id })),
      };
      if (!this.data.selectedClass.id && list.length === 1) {
        const [cls] = list;
        nextData.selectedClass = {
          id: cls.id,
          name: buildClassLabel(this.data.selectedGrade.name, cls.name),
        };
      }
      this.setData(nextData);
    } catch (e) {
      console.warn("加载班级失败", e);
    }
  },

  async loadGuardians() {
    try {
      const res = await getGuardians();
      const list = res.items || res || [];
      const nextData = {
        guardians: list,
        guardianColumns: list.map((g) => ({ text: `${g.name}（${g.phone || ""})`, value: g.id })),
      };
      if (!this.data.selectedGuardian.id && list.length === 1) {
        const [guardian] = list;
        nextData.selectedGuardian = { id: guardian.id, name: guardian.name };
      }
      this.setData(nextData);
    } catch (e) {
      console.warn("加载家长失败", e);
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onStatusChange(e) {
    this.setData({ status: e.detail });
  },

  onGenderChange(e) {
    this.setData({ gender: e.detail });
  },

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
        grades: [],
        classes: [],
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
        classes: [],
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

  openGuardianPicker() { this.setData({ showGuardianPicker: true }); },
  closeGuardianPicker() { this.setData({ showGuardianPicker: false }); },
  onGuardianConfirm(e) {
    const val = e.detail.value;
    const guardian = this.data.guardians.find((g) => g.id === val);
    if (guardian) {
      this.setData({ selectedGuardian: { id: guardian.id, name: guardian.name } });
    }
    this.closeGuardianPicker();
  },

  async onSubmit() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: "请输入学生姓名", icon: "none" });
      return;
    }
    if (!this.data.gender) {
      wx.showToast({ title: "请选择性别", icon: "none" });
      return;
    }
    if (!this.data.selectedSchool.id) {
      wx.showToast({ title: "请选择学校", icon: "none" });
      return;
    }
    if (!this.data.selectedGrade.id) {
      wx.showToast({ title: "请选择年级", icon: "none" });
      return;
    }
    if (!this.data.selectedClass.id) {
      wx.showToast({ title: "请选择班级", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      const school = this.data.schools.find((item) => item.id === this.data.selectedSchool.id);
      const grade = this.data.grades.find((item) => item.id === this.data.selectedGrade.id);
      const cls = this.data.classes.find((item) => item.id === this.data.selectedClass.id);
      const guardian = this.data.guardians.find((item) => item.id === this.data.selectedGuardian.id);
      const payload = {
        schoolId: this.data.selectedSchool.id,
        schoolName: (school && school.name) || this.data.selectedSchool.name || "",
        gradeId: this.data.selectedGrade.id,
        grade: (grade && grade.name) || this.data.selectedGrade.name || "",
        classId: this.data.selectedClass.id,
        className: (cls && cls.name) || this.data.selectedClass.name || "",
        guardianId: this.data.selectedGuardian.id,
        guardianName: (guardian && guardian.name) || this.data.selectedGuardian.name || "",
        guardianPhone: (guardian && guardian.phone) || "",
        name: this.data.name.trim(),
        gender: this.data.gender,
        status: this.data.status,
      };
      if (this.data.isEdit) payload.id = this.data.studentId;
      await saveStudent(payload);
      wx.showToast({ title: "保存成功", icon: "success" });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
      wx.showToast({ title: e.message || "保存失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },

  onDelete() {
    Dialog.confirm({ title: "确认删除", message: "删除后不可恢复，确定要删除该学生吗？" })
      .then(async () => {
        try {
          const { request } = require("../../services/request");
          await request({ method: "DELETE", url: `/students/${this.data.studentId}` });
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

