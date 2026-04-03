const { request } = require("./request");

function getSchools(params) {
  return request({ method: "GET", url: _buildURL("/schools", params) });
}

function saveSchool(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/schools/${payload.id}` : "/schools";
  return request({ data: payload, method, url });
}

function deleteSchool(id) {
  return request({ method: "DELETE", url: `/schools/${id}` });
}

function getGrades(params) {
  return request({ method: "GET", url: _buildURL("/grades", params) });
}

function saveGrade(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/grades/${payload.id}` : "/grades";
  return request({ data: payload, method, url });
}

function deleteGrade(id) {
  return request({ method: "DELETE", url: `/grades/${id}` });
}

function getClasses(params) {
  return request({ method: "GET", url: _buildURL("/classes", params) });
}

function saveClass(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/classes/${payload.id}` : "/classes";
  return request({ data: payload, method, url });
}

function deleteClass(id) {
  return request({ method: "DELETE", url: `/classes/${id}` });
}

function _buildURL(path, params) {
  const segments = [];
  Object.keys(params || {}).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null || value === "") return;
    segments.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  const query = segments.join("&");
  return query ? `${path}?${query}` : path;
}

module.exports = {
  getSchools, saveSchool, deleteSchool,
  getGrades, saveGrade, deleteGrade,
  getClasses, saveClass, deleteClass,
};
