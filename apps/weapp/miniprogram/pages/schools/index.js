const {
  getSchools, saveSchool, deleteSchool,
  getGrades, saveGrade, deleteGrade,
  getClasses, saveClass, deleteClass,
} = require("../../services/schools");
const { getStudents } = require("../../services/records");
const { canEdit } = require("../../store/session");
const { requireAuth } = require("../../utils/permission");
const Dialog = require("@vant/weapp/dialog/dialog").default;

Page({
  data: {
    schools: [],
    canEdit: false,

    showEditPopup: false,
    editTitle: "",
    editName: "",
    editType: "",
    editId: "",
    editParentId: "",
    editParentName: "",
    editSchoolId: "",
    editSchoolName: "",
  },

  onShow() {
    if (!requireAuth()) return;
    this.setData({ canEdit: canEdit() });
    this.loadSchools();
  },

  onPullDownRefresh() {
    this.loadSchools().finally(() => wx.stopPullDownRefresh());
  },

  async loadSchools() {
    try {
      const [schoolsRes, gradesRes, classesRes, studentsRes] = await Promise.all([
        getSchools().catch(() => []),
        getGrades().catch(() => []),
        getClasses().catch(() => []),
        getStudents({ status: "active" }).catch(() => []),
      ]);

      const schools = schoolsRes.items || schoolsRes || [];
      const grades = gradesRes.items || gradesRes || [];
      const classes = classesRes.items || classesRes || [];
      const students = studentsRes.items || studentsRes || [];

      const gradeMap = buildGradeMap(grades);
      const classStudentCountMap = buildClassStudentCountMap(students);
      const nextSchools = schools.map((school) => buildSchoolCard(school, classes, gradeMap, classStudentCountMap));

      this.setData({ schools: nextSchools });
    } catch (error) {
      console.warn("加载学校列表失败", error);
      this.setData({ schools: [] });
    }
  },

  onEditNameInput(e) {
    this.setData({ editName: e.detail.value });
  },

  closeEditPopup() {
    this.setData({ showEditPopup: false });
  },

  addSchool() {
    this.setData({
      showEditPopup: true,
      editTitle: "新增学校",
      editName: "",
      editType: "school",
      editId: "",
      editParentId: "",
      editParentName: "",
      editSchoolId: "",
      editSchoolName: "",
    });
  },

  editSchool(e) {
    const school = e.currentTarget.dataset.school;
    this.setData({
      showEditPopup: true,
      editTitle: "编辑学校",
      editName: school.name,
      editType: "school",
      editId: school.id,
      editParentId: "",
      editParentName: "",
      editSchoolId: "",
      editSchoolName: "",
    });
  },

  addGrade() {
    this.setData({
      showEditPopup: true,
      editTitle: "新增年级",
      editName: "",
      editType: "grade",
      editId: "",
      editParentId: "",
      editParentName: "",
      editSchoolId: "",
      editSchoolName: "",
    });
  },

  editGrade(e) {
    const grade = e.currentTarget.dataset.grade;
    this.setData({
      showEditPopup: true,
      editTitle: "编辑年级",
      editName: grade.name,
      editType: "grade",
      editId: grade.id,
      editParentId: "",
      editParentName: "",
      editSchoolId: "",
      editSchoolName: "",
    });
  },

  addClass(e) {
    const grade = e.currentTarget.dataset.grade;
    const school = e.currentTarget.dataset.school;
    this.setData({
      showEditPopup: true,
      editTitle: "新增班级",
      editName: "",
      editType: "class",
      editId: "",
      editParentId: grade.id,
      editParentName: grade.name,
      editSchoolId: school.id,
      editSchoolName: school.name,
    });
  },

  editClass(e) {
    const cls = e.currentTarget.dataset.class;
    const grade = e.currentTarget.dataset.grade;
    const school = e.currentTarget.dataset.school;
    this.setData({
      showEditPopup: true,
      editTitle: "编辑班级",
      editName: cls.name,
      editType: "class",
      editId: cls.id,
      editParentId: grade.id,
      editParentName: grade.name,
      editSchoolId: school.id,
      editSchoolName: school.name,
    });
  },

  async onEditConfirm() {
    const {
      editType,
      editName,
      editId,
      editParentId,
      editParentName,
      editSchoolId,
      editSchoolName,
    } = this.data;

    if (!editName.trim()) {
      wx.showToast({ title: "请输入名称", icon: "none" });
      return;
    }

    try {
      const payload = { name: editName.trim() };
      if (editId) payload.id = editId;

      if (editType === "school") {
        await saveSchool(payload);
      } else if (editType === "grade") {
        await saveGrade(payload);
      } else if (editType === "class") {
        payload.gradeId = editParentId;
        payload.gradeName = editParentName;
        payload.schoolId = editSchoolId;
        payload.schoolName = editSchoolName;
        await saveClass(payload);
      }

      wx.showToast({ title: "保存成功", icon: "success" });
      this.closeEditPopup();
      this.loadSchools();
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    }
  },

  removeSchool(e) {
    const id = e.currentTarget.dataset.id;
    Dialog.confirm({ title: "确认删除", message: "删除学校将同时删除其下所有班级关联展示" })
      .then(async () => {
        try {
          await deleteSchool(id);
          wx.showToast({ title: "已删除", icon: "success" });
          this.loadSchools();
        } catch (error) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      })
      .catch(() => {});
  },

  removeGrade(e) {
    const id = e.currentTarget.dataset.id;
    Dialog.confirm({ title: "确认删除", message: "删除年级后将影响所有关联班级" })
      .then(async () => {
        try {
          await deleteGrade(id);
          wx.showToast({ title: "已删除", icon: "success" });
          this.loadSchools();
        } catch (error) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      })
      .catch(() => {});
  },

  removeClass(e) {
    const id = e.currentTarget.dataset.id;
    Dialog.confirm({ title: "确认删除", message: "确定要删除该班级吗？" })
      .then(async () => {
        try {
          await deleteClass(id);
          wx.showToast({ title: "已删除", icon: "success" });
          this.loadSchools();
        } catch (error) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      })
      .catch(() => {});
  },
});

function buildGradeMap(grades) {
  const map = {};
  (grades || []).forEach((grade) => {
    if (!grade || !grade.id) return;
    map[grade.id] = grade;
  });
  return map;
}

function buildClassStudentCountMap(students) {
  const map = {};
  (students || []).forEach((student) => {
    const key = buildClassStudentKey(student.classId, student.schoolName, student.gradeName || student.grade, student.className);
    if (!key) return;
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function buildSchoolCard(school, classes, gradeMap, classStudentCountMap) {
  const schoolClasses = (classes || []).filter((item) => String(item.schoolId || "") === String(school.id || ""));
  const groupedGrades = buildSchoolGrades(schoolClasses, gradeMap, classStudentCountMap);
  return {
    ...school,
    gradeCount: groupedGrades.length,
    classTotal: groupedGrades.reduce((sum, grade) => sum + grade.classCount, 0),
    grades: groupedGrades,
  };
}

function buildSchoolGrades(classes, gradeMap, classStudentCountMap) {
  const grouped = {};

  (classes || []).forEach((item) => {
    const gradeKey = item.gradeId || `name:${item.gradeName || "未分组年级"}`;
    if (!grouped[gradeKey]) {
      const gradeInfo = gradeMap[item.gradeId] || {};
      grouped[gradeKey] = {
        id: item.gradeId || gradeKey,
        name: item.gradeName || gradeInfo.name || "未分组年级",
        classes: [],
      };
    }

    grouped[gradeKey].classes.push({
      ...item,
      studentCount: resolveClassStudentCount(item, classStudentCountMap),
    });
  });

  return Object.keys(grouped)
    .map((key) => ({
      ...grouped[key],
      classCount: grouped[key].classes.length,
      classes: grouped[key].classes.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-CN")),
    }))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-CN"));
}

function resolveClassStudentCount(item, classStudentCountMap) {
  const idKey = buildClassStudentKey(item.id, item.schoolName, item.gradeName, item.name);
  if (classStudentCountMap[idKey]) {
    return classStudentCountMap[idKey];
  }
  const nameKey = buildClassStudentKey("", item.schoolName, item.gradeName, item.name);
  return classStudentCountMap[nameKey] || 0;
}

function buildClassStudentKey(classId, schoolName, gradeName, className) {
  if (classId) {
    return `id:${classId}`;
  }
  if (!schoolName && !gradeName && !className) {
    return "";
  }
  return `name:${schoolName || ""}::${gradeName || ""}::${className || ""}`;
}
