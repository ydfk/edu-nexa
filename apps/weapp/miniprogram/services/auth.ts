const { request } = require("./request");

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
  weappPhoneLogin,
  getProfile,
  updateProfile,
  changePassword,
};
