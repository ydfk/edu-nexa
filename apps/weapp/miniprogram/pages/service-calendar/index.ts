const { getSession } = require("../../store/session");
const { formatDate, getToday, shiftDate } = require("../../utils/date");
const { getCampuses, getServiceDays, saveServiceDay } = require("../../services/records");

Page({
  data: {
    activeRole: "",
    activeCampusTab: 0,
    calendarItems: [],
    canEdit: false,
    editorDraft: null,
    selectedDate: getToday(),
    showDateCalendar: false,
  },
  onShow() {
    this.loadPage();
  },
  async loadPage() {
    const session = getSession();
    if (!session.token || !session.user) {
      this.setData({
        activeRole: "",
        activeCampusTab: 0,
        calendarItems: [],
        canEdit: false,
        editorDraft: null,
        showDateCalendar: false,
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

    const editorDraft = resolveEditorDraft(this.data.editorDraft, calendarItems);

    this.setData({
      activeRole,
      activeCampusTab: Math.max(
        calendarItems.findIndex((item) => editorDraft && item.campusId === editorDraft.campusId),
        0
      ),
      calendarItems,
      canEdit,
      editorDraft,
      showDateCalendar: false,
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
  handleCampusTabChange(event) {
    const tabIndex = Number(event.detail.index || 0);
    const calendarItem = this.data.calendarItems[tabIndex];
    if (!calendarItem) {
      return;
    }

    this.setData({
      activeCampusTab: tabIndex,
      editorDraft: { ...calendarItem },
    });
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
  handleMealSwitch(event) {
    this.setData({
      "editorDraft.hasMealService": !!event.detail,
    });
  },
  handleHomeworkSwitch(event) {
    this.setData({
      "editorDraft.hasHomeworkService": !!event.detail,
    });
  },
  handleRemarkInput(event) {
    this.setData({
      "editorDraft.remark": event.detail,
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
