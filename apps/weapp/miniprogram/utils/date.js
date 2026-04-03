function formatDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getToday() {
  return formatDate(new Date());
}

function shiftDate(dateString, offsetDays) {
  const target = new Date(`${dateString}T00:00:00`);
  target.setDate(target.getDate() + offsetDays);
  return formatDate(target);
}

/** 格式化为中文友好日期，如 "03月28日 周六" */
function formatDateCN(dateString) {
  const d = new Date(`${dateString}T00:00:00`);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${month}月${day}日 ${weekdays[d.getDay()]}`;
}

/** 判断是否是今天 */
function isToday(dateString) {
  return dateString === getToday();
}

/** 格式化为简短日期 "03-28" */
function formatShortDate(dateString) {
  if (!dateString || dateString.length < 10) return "";
  return dateString.substring(5);
}

module.exports = {
  formatDate,
  getToday,
  shiftDate,
  formatDateCN,
  isToday,
  formatShortDate,
};
