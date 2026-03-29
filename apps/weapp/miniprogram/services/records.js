const { request } = require("./request");

function getOverview() {
  return request({
    url: "/overview",
    method: "GET",
  });
}

function getMealRecords() {
  return request({
    url: "/meal-records",
    method: "GET",
  });
}

function getHomeworkRecords() {
  return request({
    url: "/homework-records",
    method: "GET",
  });
}

module.exports = {
  getOverview,
  getMealRecords,
  getHomeworkRecords,
};
