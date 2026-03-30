const { getSession } = require("../../store/session");
const { getToday, shiftDate } = require("../../utils/date");
const { getCampuses, getServiceDays, saveServiceDay } = require("../../services/records");

Page({
  data: {
    activeRole: "",
    calendarItems: [],
    canEdit: false,
    editorDraft: null,
    selectedDate: getToday(),
  },
  onShow() {
    this.loadPage();
  },
  async loadPage() {
    const session = getSession();
    if (!session.token || !session.user) {
      this.setData({
        activeRole: "",
        calendarItems: [],
        canEdit: false,
        editorDraft: null,
      });
      return;
    }

    const activeRole = session.activeRole || (session.user.roles || [])[0] || "";
    const canEdit = activeRole === "admin";
    const selectedDate = this.data.selectedDate;
    const [campuses, serviceDays] = await Promise.all([
      getCampuses({ status: "active" }),
      getServiceDays({ serviceDate: selectedDate }),
    ]);
    const calendarItems = campuses.map((campus) => {
      const existing = serviceDays.find((item) => item.campusId === campus.id);
      return {
        campusId: campus.id,
        campusName: campus.name,
        hasHomeworkService: existing ? !!existing.hasHomeworkService : true,
        hasMealService: existing ? !!existing.hasMealService : true,
        id: existing ? existing.id : "",
        remark: existing ? existing.remark || "" : "",
        serviceDate: selectedDate,
      };
    });

    this.setData({
      activeRole,
      calendarItems,
      canEdit,
      editorDraft: resolveEditorDraft(this.data.editorDraft, calendarItems),
    });
  },
  handleShiftDate(event) {
    const offset = Number(event.currentTarget.dataset.offset || 0);
    this.setData({
      selectedDate: shiftDate(this.data.selectedDate, offset),
    });
    this.loadPage();
  },
  handleSelectCampus(event) {
    const campusId = event.currentTarget.dataset.campusId;
    const calendarItem = this.data.calendarItems.find((item) => item.campusId === campusId);
    if (!calendarItem) {
      return;
    }
    this.setData({
      editorDraft: { ...calendarItem },
    });
  },
  handleMealSwitch(event) {
    this.setData({
      "editorDraft.hasMealService": !!event.detail.value,
    });
  },
  handleHomeworkSwitch(event) {
    this.setData({
      "editorDraft.hasHomeworkService": !!event.detail.value,
    });
  },
  handleRemarkInput(event) {
    this.setData({
      "editorDraft.remark": event.detail.value,
    });
  },
  async handleSave() {
    const draft = this.data.editorDraft;
    if (!draft) {
      return;
    }

    try {
      await saveServiceDay({
        campusId: draft.campusId,
        hasHomeworkService: draft.hasHomeworkService,
        hasMealService: draft.hasMealService,
        id: draft.id,
        remark: draft.remark,
        serviceDate: this.data.selectedDate,
      });
      wx.showToast({
        title: "已保存服务日历",
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

function resolveEditorDraft(editorDraft, calendarItems) {
  if (!calendarItems.length) {
    return null;
  }
  if (editorDraft) {
    const existing = calendarItems.find((item) => item.campusId === editorDraft.campusId);
    if (existing) {
      return { ...existing };
    }
  }
  return { ...calendarItems[0] };
}
