const { request } = require("./request");

function login(payload) {
  return request({
    url: "/auth/login",
    method: "POST",
    data: payload,
  });
}

function weappPhoneLogin(payload) {
  return request({
    url: "/auth/weapp/phone-login",
    method: "POST",
    data: payload,
  });
}

function getProfile() {
  return request({ method: "GET", url: "/auth/profile" });
}

function updateProfile(payload) {
  return request({ method: "PUT", url: "/auth/profile", data: payload });
}

function changePassword(payload) {
  return request({
    method: "POST",
    url: "/auth/change-password",
    data: payload,
  });
}

module.exports = {
  login,
  weappPhoneLogin,
  getProfile,
  updateProfile,
  changePassword,
};
