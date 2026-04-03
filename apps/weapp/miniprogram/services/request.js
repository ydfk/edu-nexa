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

function uploadFile(options) {
  const session = getSession();

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      ...options,
      url: `${env.baseURL}${options.url}`,
      header: {
        Authorization: session.token ? `Bearer ${session.token}` : "",
        ...(options.header || {}),
      },
      success(result) {
        let payload = null;
        try {
          payload = JSON.parse(result.data);
        } catch {
          reject(new Error("上传失败"));
          return;
        }

        if (result.statusCode >= 400 || !payload || payload.flag !== true) {
          reject(new Error(payload?.msg || "上传失败"));
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
  uploadFile,
};
