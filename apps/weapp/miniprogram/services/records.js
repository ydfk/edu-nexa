const { request } = require("./request");

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

function getDailyHomeworkPrintPDF(params) {
  return request({
    method: "GET",
    url: buildURL("/daily-homework/print-pdf", params),
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

function uploadAttachment(options) {
  return getAliyunPostForm(options)
    .then((config) =>
      uploadFileByAliyunPostForm({
        filePath: options.filePath,
        formData: config.formData || {},
        uploadURL: config.host,
      }).then(() => ({
        bucket: config.bucket,
        extension: extractFileExtension(options.fileName || options.filePath),
        name: options.fileName || extractFileName(options.filePath),
        objectKey: config.objectKey,
        provider: config.provider,
        size: Number(options.fileSize) || 0,
        url: config.publicURL,
      })),
    )
    .catch((error) => {
      if (!shouldFallbackToSignedUpload(error)) {
        throw error;
      }

      return getDirectUploadURL(options).then((config) =>
        uploadFileToSignedURL({
          filePath: options.filePath,
          headers: config.headers || {},
          method: config.method || "PUT",
          uploadURL: config.uploadURL,
        }).then(() => ({
          bucket: config.bucket,
          extension: extractFileExtension(options.fileName || options.filePath),
          name: options.fileName || extractFileName(options.filePath),
          objectKey: config.objectKey,
          provider: config.provider,
          size: Number(options.fileSize) || 0,
          url: config.publicURL,
        })),
      );
    });
}

function getAttachmentAccessURL(options) {
  const targetURL = String((options && options.url) || "").trim();
  const objectKey = String((options && options.objectKey) || "").trim();
  if (!targetURL && !objectKey) {
    return Promise.reject(new Error("附件标识不能为空"));
  }

  return request({
    method: "GET",
    url: buildURL("/uploads/access-url", {
      bucket: options && options.bucket,
      disposition: options && options.disposition,
      fileName: options && options.fileName,
      objectKey,
      url: targetURL,
    }),
  });
}

function getAliyunPostForm(options) {
  return request({
    method: "GET",
    url: buildURL("/uploads/aliyun-post-form", {
      contentType: options.contentType || detectContentType(options.fileName || options.filePath),
      fileName: options.fileName || extractFileName(options.filePath),
      fileSize: options.fileSize || "",
      purpose: options.purpose || "records",
    }),
  });
}

function getDirectUploadURL(options) {
  return request({
    method: "GET",
    url: buildURL("/uploads/direct-upload-url", {
      contentType: options.contentType || detectContentType(options.fileName || options.filePath),
      fileName: options.fileName || extractFileName(options.filePath),
      fileSize: options.fileSize || "",
      purpose: options.purpose || "records",
    }),
  });
}

function uploadFileByAliyunPostForm(options) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      filePath: options.filePath,
      formData: options.formData || {},
      name: "file",
      success(result) {
        if (result.statusCode === 200 || result.statusCode === 204) {
          resolve();
          return;
        }
        reject(new Error("上传失败"));
      },
      fail: reject,
      url: options.uploadURL,
    });
  });
}

function uploadFileToSignedURL(options) {
  return readLocalFile(options.filePath).then((data) =>
    new Promise((resolve, reject) => {
      wx.request({
        data,
        enableHttp2: true,
        header: options.headers || {},
        method: options.method || "PUT",
        responseType: "text",
        success(result) {
          if (result.statusCode >= 200 && result.statusCode < 300) {
            resolve();
            return;
          }
          reject(new Error("上传失败"));
        },
        fail: reject,
        url: options.uploadURL,
      });
    }),
  );
}

function extractFileName(filePath) {
  const parts = String(filePath || "").split(/[\\/]/);
  return parts[parts.length - 1] || "attachment";
}

function detectContentType(fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }
  if (lower.endsWith(".heic")) {
    return "image/heic";
  }
  return "image/jpeg";
}

function readLocalFile(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      success(result) {
        resolve(result.data);
      },
      fail: reject,
    });
  });
}

function shouldFallbackToSignedUpload(error) {
  if (!error || typeof error.message !== "string") {
    return false;
  }

  return [
    "当前上传存储未配置为阿里云 OSS",
    "阿里云 OSS STS 角色 ARN 未配置",
    "阿里云 OSS 配置不完整",
  ].some((message) => error.message.includes(message));
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

function extractFileExtension(fileName) {
  const lower = String(fileName || "").trim().toLowerCase();
  const extensionIndex = lower.lastIndexOf(".");
  if (extensionIndex <= 0 || extensionIndex === lower.length - 1) {
    return "";
  }
  return lower.slice(extensionIndex);
}

module.exports = {
  getCampuses,
  getDailyHomework,
  getDailyHomeworkPrintPDF,
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
  getAttachmentAccessURL,
  uploadAttachment,
};
