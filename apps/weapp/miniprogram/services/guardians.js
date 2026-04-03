const { request } = require("./request");

function getGuardians(params) {
  return request({ method: "GET", url: _buildURL("/guardian-profiles", params) });
}

function saveGuardian(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/guardian-profiles/${payload.id}` : "/guardian-profiles";
  return request({ data: payload, method, url });
}

function deleteGuardian(id) {
  return request({ method: "DELETE", url: `/guardian-profiles/${id}` });
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

module.exports = { getGuardians, saveGuardian, deleteGuardian };
