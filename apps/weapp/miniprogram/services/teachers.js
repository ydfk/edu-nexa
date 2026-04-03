const { request } = require("./request");
const { buildURL } = require("./request");

function getUsers(params) {
  return request({ method: "GET", url: _buildURL("/users", params) });
}

function saveUser(payload) {
  const method = payload.id ? "PUT" : "POST";
  const url = payload.id ? `/users/${payload.id}` : "/users";
  return request({ data: payload, method, url });
}

function deleteUser(id) {
  return request({ method: "DELETE", url: `/users/${id}` });
}

function resetUserPassword(id) {
  return request({ method: "POST", url: `/users/${id}/reset-password` });
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

module.exports = { getUsers, saveUser, deleteUser, resetUserPassword };
