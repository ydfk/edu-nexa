const { getAttachmentAccessURL, getDailyHomework, getDailyHomeworkPrintPDF } = require("../../services/records");
const { getSession, isGuardian, canEdit } = require("../../store/session");
const {
  buildAttachmentCardItems,
  extractAttachmentName,
  normalizeAttachmentList,
  openAttachment: openStoredAttachment,
} = require("../../utils/attachment");
const { requireAuth } = require("../../utils/permission");
const { getToday, shiftDate, formatDateCN, formatDate } = require("../../utils/date");

Page({
  data: {
    currentDate: "",
    dateDisplay: "",
    showCalendar: false,
    calendarDate: null,
    homeworkGroups: [],
    canEdit: false,
  },

  onLoad(options) {
    if (options.entry === "print") {
      this._openPrintEntry = true;
    }
  },

  onShow() {
    if (!requireAuth()) return;
    const today = this.data.currentDate || getToday();
    this.setData({
      currentDate: today,
      dateDisplay: formatDateCN(today),
      canEdit: canEdit(),
    });
    this.loadHomework();
    if (this._openPrintEntry) {
      this._openPrintEntry = false;
      this.onPrintHomework();
    }
  },

  onPullDownRefresh() {
    this.loadHomework().finally(() => wx.stopPullDownRefresh());
  },

  prevDay() {
    const d = shiftDate(this.data.currentDate, -1);
    this.setData({ currentDate: d, dateDisplay: formatDateCN(d) });
    this.loadHomework();
  },

  nextDay() {
    const d = shiftDate(this.data.currentDate, 1);
    this.setData({ currentDate: d, dateDisplay: formatDateCN(d) });
    this.loadHomework();
  },

  openCalendar() {
    this.setData({
      showCalendar: true,
      calendarDate: new Date(`${this.data.currentDate}T00:00:00`).getTime(),
    });
  },

  closeCalendar() {
    this.setData({ showCalendar: false });
  },

  onCalendarConfirm(e) {
    const d = formatDate(new Date(e.detail));
    this.setData({ showCalendar: false, currentDate: d, dateDisplay: formatDateCN(d) });
    this.loadHomework();
  },

  async loadHomework() {
    try {
      const params = { serviceDate: this.data.currentDate };
      if (isGuardian()) {
        const session = getSession();
        params.guardianPhone = session.user?.phone;
      }
      const res = await getDailyHomework(params);
      const list = res.items || res || [];
      this.setData({ homeworkGroups: buildHomeworkGroups(list) });
    } catch (e) {
      console.warn("加载每日作业失败", e);
      this.setData({ homeworkGroups: [] });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/daily-homework/detail?id=${id}` });
  },

  async openAttachment(e) {
    const itemIndex = Number(e.currentTarget.dataset.index || 0);
    const attachments = normalizeAttachmentList(e.currentTarget.dataset.attachments || []);
    const attachment = attachments[itemIndex];
    if (!attachment) {
      return;
    }

    openStoredAttachment(attachment, attachments).catch(() => {
      wx.showToast({ title: "打开失败", icon: "none" });
    });
  },

  onAdd() {
    wx.navigateTo({ url: `/pages/daily-homework/detail?date=${this.data.currentDate}` });
  },

  onPrintHomework() {
    wx.showLoading({ title: "生成中..." });
    getDailyHomeworkPrintPDF({ serviceDate: this.data.currentDate })
      .then((res) =>
        getAttachmentAccessURL({
          disposition: "inline",
          bucket: res.bucket,
          fileName: extractAttachmentName(res.objectKey || res.url || ""),
          objectKey: res.objectKey,
          url: res.url,
        }).then((result) => downloadAndOpenHomeworkPrintPDF(result.url || res.url)),
      )
      .then(() => {
        wx.showModal({
          title: "已打开 PDF",
          content: "请通过右上角菜单下载，或使用其他应用打开后完成打印。",
          showCancel: false,
          confirmText: "知道了",
        });
      })
      .catch((error) => {
        wx.showToast({
          title: error && error.message ? error.message : "生成打印文件失败",
          icon: "none",
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },
});

function buildHomeworkGroups(items) {
  const groupMap = {};

  (items || []).forEach((item) => {
    const groupKey = [item.schoolId || item.schoolName, item.gradeName || item.grade, item.classId || item.className].join("::");
    if (!groupMap[groupKey]) {
      groupMap[groupKey] = {
        key: groupKey,
        schoolName: item.schoolName || "",
        gradeName: item.gradeName || item.grade || "",
        className: item.className || "",
        items: [],
      };
    }

    groupMap[groupKey].items.push({
      ...item,
      attachmentItems: buildAttachmentCardItems(item.attachments),
      attachments: normalizeAttachmentList(item.attachments),
      contentText: buildHomeworkContentText(item),
    });
  });

  return Object.keys(groupMap).map((key) => ({
    ...groupMap[key],
    items: groupMap[key].items.sort((a, b) => String(a.subject || "").localeCompare(String(b.subject || ""), "zh-CN")),
  }));
}

function buildHomeworkContentText(item) {
  const contents = (item.items || []).map((entry) => entry.content).filter(Boolean);
  if (contents.length > 0) {
    return contents.join("；");
  }
  return item.content || "";
}

function downloadAndOpenHomeworkPrintPDF(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("打印文件地址无效"));
      return;
    }

    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          reject(new Error("下载打印文件失败"));
          return;
        }

        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: "pdf",
          showMenu: true,
          success: resolve,
          fail: () => reject(new Error("打开 PDF 失败")),
        });
      },
      fail: () => reject(new Error("下载打印文件失败")),
    });
  });
}
