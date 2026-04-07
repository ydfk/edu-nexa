const { env } = require("../config/env");
const { getSession } = require("../store/session");

function normalizeResponsePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  return payload;
}

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
        const payload = normalizeResponsePayload(result.data);
        if (result.statusCode >= 400) {
          reject(new Error("请求失败"));
          return;
        }

        if (payload.flag !== true) {
          reject(new Error(payload.msg || "请求失败"));
          return;
        }

        resolve(payload.data);
      },
      fail: reject,
    });
  });
}

module.exports = {
  request,
};
