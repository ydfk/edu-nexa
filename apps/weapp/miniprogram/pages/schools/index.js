const {
  getSchools, saveSchool, deleteSchool,
  getGrades, saveGrade, deleteGrade,
  getClasses, saveClass, deleteClass,
} = require("../../services/schools");
const { canEdit } = require("../../store/session");
const { requireAuth } = require("../../utils/permission");
const Dialog = require("@vant/weapp/dialog/dialog");

Page({
  data: {
    schools: [],
    activeSchool: "",
    canEdit: false,

    showEditPopup: false,
    editTitle: "",
    editName: "",
    editType: "",
    editId: "",
    editParentId: "",
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
      const res = await getSchools();
      const schools = res.items || res || [];

      for (const school of schools) {
        try {
          const gRes = await getGrades({ schoolId: school.id });
          school.grades = (gRes.items || gRes || []).map((g) => ({ ...g, expanded: false, classes: [] }));
          school.gradeCount = school.grades.length;

          for (const grade of school.grades) {
            try {
              const cRes = await getClasses({ gradeId: grade.id });
              grade.classes = cRes.items || cRes || [];
              grade.classCount = grade.classes.length;
            } catch (e) {
              grade.classes = [];
              grade.classCount = 0;
            }
          }
        } catch (e) {
          school.grades = [];
          school.gradeCount = 0;
        }
      }

      this.setData({ schools });
    } catch (e) {
      console.warn("加载学校列表失败", e);
    }
  },

  onSchoolCollapse(e) {
    this.setData({ activeSchool: e.detail });
  },

  toggleGrade(e) {
    const { schoolId, gradeId } = e.currentTarget.dataset;
    const schools = this.data.schools;
    const school = schools.find((s) => s.id === schoolId);
    if (!school) return;
    const grade = school.grades.find((g) => g.id === gradeId);
    if (!grade) return;
    grade.expanded = !grade.expanded;
    this.setData({ schools });
  },

  onEditNameInput(e) {
    this.setData({ editName: e.detail.value });
  },

  closeEditPopup() {
    this.setData({ showEditPopup: false });
  },

  addSchool() {
    this.setData({ showEditPopup: true, editTitle: "新增学校", editName: "", editType: "school", editId: "", editParentId: "" });
  },

  editSchool(e) {
    const school = e.currentTarget.dataset.school;
    this.setData({ showEditPopup: true, editTitle: "编辑学校", editName: school.name, editType: "school", editId: school.id, editParentId: "" });
  },

  addGrade(e) {
    const schoolId = e.currentTarget.dataset.schoolId;
    this.setData({ showEditPopup: true, editTitle: "新增年级", editName: "", editType: "grade", editId: "", editParentId: schoolId });
  },

  editGrade(e) {
    const { grade, schoolId } = e.currentTarget.dataset;
    this.setData({ showEditPopup: true, editTitle: "编辑年级", editName: grade.name, editType: "grade", editId: grade.id, editParentId: schoolId });
  },

  addClass(e) {
    const gradeId = e.currentTarget.dataset.gradeId;
    this.setData({ showEditPopup: true, editTitle: "新增班级", editName: "", editType: "class", editId: "", editParentId: gradeId });
  },

  editClass(e) {
    const { class: cls, gradeId } = e.currentTarget.dataset;
    this.setData({ showEditPopup: true, editTitle: "编辑班级", editName: cls.name, editType: "class", editId: cls.id, editParentId: gradeId });
  },

  async onEditConfirm() {
    const { editType, editName, editId, editParentId } = this.data;
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
        payload.schoolId = editParentId;
        await saveGrade(payload);
      } else if (editType === "class") {
        payload.gradeId = editParentId;
        await saveClass(payload);
      }

      wx.showToast({ title: "保存成功", icon: "success" });
      this.closeEditPopup();
      this.loadSchools();
    } catch (e) {
      wx.showToast({ title: e.message || "保存失败", icon: "none" });
    }
  },

  removeSchool(e) {
    const id = e.currentTarget.dataset.id;
    Dialog.confirm({ title: "确认删除", message: "删除学校将同时删除其下所有年级和班级" })
      .then(async () => {
        try {
          await deleteSchool(id);
          wx.showToast({ title: "已删除", icon: "success" });
          this.loadSchools();
        } catch (e) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      })
      .catch(() => {});
  },

  removeGrade(e) {
    const id = e.currentTarget.dataset.id;
    Dialog.confirm({ title: "确认删除", message: "删除年级将同时删除其下所有班级" })
      .then(async () => {
        try {
          await deleteGrade(id);
          wx.showToast({ title: "已删除", icon: "success" });
          this.loadSchools();
        } catch (e) {
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
        } catch (e) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      })
      .catch(() => {});
  },
});

