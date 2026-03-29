const { env } = require("../config/env");
const { getSession } = require("../store/session");

function request(options) {
  const session = getSession();

  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url: `${env.baseURL}${options.url}`,
      header: {
        "Content-Type": "application/json",
        Authorization: session.token ? `Bearer ${session.token}` : "",
        ...(options.header || {}),
      },
      success(result) {
        if (result.statusCode >= 400) {
          reject(new Error("请求失败"));
          return;
        }

        if (!result.data || result.data.flag !== true) {
          reject(new Error(result.data?.msg || "请求失败"));
          return;
        }

        resolve(result.data.data);
      },
      fail: reject,
    });
  });
}

module.exports = {
  request,
};
