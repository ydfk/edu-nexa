const { request, uploadFile } = require("./request");

function getOverview() {
  return request({
    method: "GET",
    url: "/overview",
  });
}

function getHomeConfig() {
  return request({
    method: "GET",
    url: "/home-config",
  });
}

function getStudents(params) {
  return request({
    method: "GET",
    url: buildURL("/students", params),
  });
}

function saveStudent(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/students/${payload.id}` : "/students";

  return request({
    data: payload,
    method,
    url,
  });
}

function getCampuses(params) {
  return request({
    method: "GET",
    url: buildURL("/campuses", params),
  });
}

function getMealRecords(params) {
  return request({
    method: "GET",
    url: buildURL("/meal-records", params),
  });
}

function saveMealRecord(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/meal-records/${payload.id}` : "/meal-records";

  return request({
    data: payload,
    method,
    url,
  });
}

function getHomeworkRecords(params) {
  return request({
    method: "GET",
    url: buildURL("/homework-records", params),
  });
}

function saveHomeworkRecord(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/homework-records/${payload.id}` : "/homework-records";

  return request({
    data: payload,
    method,
    url,
  });
}

function getDailyHomework(params) {
  return request({
    method: "GET",
    url: buildURL("/daily-homework", params),
  });
}

function saveDailyHomework(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/daily-homework/${payload.id}` : "/daily-homework";

  return request({
    data: payload,
    method,
    url,
  });
}

function getServiceDays(params) {
  return request({
    method: "GET",
    url: buildURL("/service-days", params),
  });
}

function saveServiceDay(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/service-days/${payload.id}` : "/service-days";

  return request({
    data: payload,
    method,
    url,
  });
}

function getStudentServices(params) {
  return request({
    method: "GET",
    url: buildURL("/student-services", params),
  });
}

function saveStudentService(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/student-services/${payload.id}` : "/student-services";

  return request({
    data: payload,
    method,
    url,
  });
}

function uploadImage(options) {
  return uploadFile({
    filePath: options.filePath,
    formData: {
      provider: options.provider || "",
      purpose: options.purpose || "records",
    },
    name: "file",
    url: "/uploads/images",
  });
}

function buildURL(path, params) {
  const segments = [];
  Object.keys(params || {}).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") {
      return;
    }
    segments.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });

  const query = segments.join("&");
  return query ? `${path}?${query}` : path;
}

module.exports = {
  getCampuses,
  getDailyHomework,
  getHomeConfig,
  getHomeworkRecords,
  getMealRecords,
  getOverview,
  getServiceDays,
  getStudentServices,
  getStudents,
  saveServiceDay,
  saveDailyHomework,
  saveHomeworkRecord,
  saveMealRecord,
  saveStudent,
  saveStudentService,
  uploadImage,
};
