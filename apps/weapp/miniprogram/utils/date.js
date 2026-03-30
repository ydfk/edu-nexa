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

module.exports = {
  getToday,
  shiftDate,
};
