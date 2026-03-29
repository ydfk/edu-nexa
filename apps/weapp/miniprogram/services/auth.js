const { request } = require("./request");

function weappPhoneLogin(payload) {
  return request({
    url: "/auth/weapp/phone-login",
    method: "POST",
    data: payload,
  });
}

module.exports = {
  weappPhoneLogin,
};
