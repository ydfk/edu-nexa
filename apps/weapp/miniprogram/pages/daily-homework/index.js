const { getDailyHomework, getDailyHomeworkPrintPDF } = require("../../services/records");
const { getSession, isGuardian, canEdit } = require("../../store/session");
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

  openAttachment(e) {
    const url = e.currentTarget.dataset.url || "";
    const type = e.currentTarget.dataset.type || "";
    const imageUrls = e.currentTarget.dataset.imageUrls || [];

    if (!url || !type) {
      return;
    }

    if (type === "image") {
      const urls = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : [url];
      wx.previewImage({ current: url, urls });
      return;
    }

    if (type === "pdf") {
      wx.showLoading({ title: "打开中..." });
      wx.downloadFile({
        url,
        success: (res) => {
          wx.hideLoading();
          if (res.statusCode !== 200 || !res.tempFilePath) {
            wx.showToast({ title: "打开失败", icon: "none" });
            return;
          }
          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: "pdf",
            showMenu: true,
            fail: () => wx.showToast({ title: "无法预览 PDF", icon: "none" }),
          });
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: "打开失败", icon: "none" });
        },
      });
      return;
    }

    wx.showToast({ title: "仅支持预览图片或PDF", icon: "none" });
  },

  onAdd() {
    wx.navigateTo({ url: `/pages/daily-homework/detail?date=${this.data.currentDate}` });
  },

  onPrintHomework() {
    wx.showLoading({ title: "生成中..." });
    getDailyHomeworkPrintPDF({ serviceDate: this.data.currentDate })
      .then((res) => downloadAndOpenHomeworkPrintPDF(res.url))
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
      attachmentItems: buildAttachmentItems(item.attachments),
      imageAttachmentUrls: buildImageAttachmentUrls(item.attachments),
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

function parseAttachments(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const items = JSON.parse(String(raw));
    if (Array.isArray(items)) {
      return items.filter((item) => typeof item === "string" && item.trim());
    }
  } catch (error) {
    // 兼容旧的逗号分隔格式
  }
  return String(raw)
    .split(",")
    .map((item) => item.trim().replace(/^\[/, "").replace(/\]$/, "").replace(/^"/, "").replace(/"$/, ""))
    .filter(Boolean);
}

function buildAttachmentItems(raw) {
  return parseAttachments(raw).map((url) => ({
    name: getAttachmentName(url),
    type: getAttachmentType(url),
    url,
  }));
}

function buildImageAttachmentUrls(raw) {
  return parseAttachments(raw).filter((url) => getAttachmentType(url) === "image");
}

function getAttachmentType(url) {
  const lower = String(url || "").toLowerCase();
  if (lower.endsWith(".pdf")) {
    return "pdf";
  }
  return "image";
}

function getAttachmentName(url) {
  const parts = String(url || "").split("/");
  return parts[parts.length - 1] || "附件";
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
