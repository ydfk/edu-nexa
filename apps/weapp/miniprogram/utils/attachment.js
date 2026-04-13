const { getAttachmentAccessURL } = require("../services/records");

function normalizeAttachmentList(raw) {
  const items = parseAttachmentValues(raw);
  return items
    .map((item) => normalizeAttachmentItem(item))
    .filter(Boolean);
}

function serializeAttachmentList(items) {
  return (items || [])
    .map((item) => normalizeAttachmentItem(item))
    .filter((item) => item && (item.objectKey || item.url))
    .map((item) => ({
      bucket: item.bucket || "",
      extension: item.extension || "",
      name: item.name,
      objectKey: item.objectKey || "",
      size: item.size || 0,
      url: item.objectKey ? "" : item.url || "",
    }));
}

function createAttachmentRefFromUploadResult(result, fallbackName) {
  const objectKey = String((result && result.objectKey) || "").trim();
  const url = String((result && result.url) || "").trim();
  const name = normalizeAttachmentDisplayName(fallbackName, objectKey || url, detectAttachmentType(result && result.extension || objectKey || url));
  const extension = normalizeAttachmentExtension(result && result.extension, name, objectKey || url);

  return {
    bucket: String((result && result.bucket) || "").trim(),
    extension,
    name,
    objectKey,
    size: normalizeAttachmentSize(result && result.size),
    type: detectAttachmentType(extension || name || objectKey || url),
    url,
  };
}

function buildAttachmentFileList(items) {
  return normalizeAttachmentList(items).map((item) => ({
    isImage: false,
    name: item.name,
    type: item.type,
    url: item.type === "image" ? "" : item.url || "",
  }));
}

function buildAttachmentCardItems(items) {
  return normalizeAttachmentList(items).map((item) => ({
    key: buildAttachmentKey(item),
    name: item.name,
    type: item.type,
  }));
}

async function openAttachment(item, allItems) {
  const attachment = normalizeAttachmentItem(item);
  if (!attachment) {
    throw new Error("附件不存在");
  }

  if (attachment.type === "image") {
    const imageItems = normalizeAttachmentList(allItems || [attachment]).filter((entry) => entry.type === "image");
    const targetItems = imageItems.length > 0 ? imageItems : [attachment];
    wx.showLoading({ title: "打开中..." });
    let localPaths = [];
    try {
      localPaths = await Promise.all(
        targetItems.map((entry) => resolveAttachmentPreviewFile(entry)),
      );
    } finally {
      wx.hideLoading();
    }
    const currentURL = localPaths[targetItems.findIndex((entry) => buildAttachmentKey(entry) === buildAttachmentKey(attachment))] || localPaths[0];
    if (!currentURL) {
      throw new Error("图片地址无效");
    }

    await new Promise((resolve, reject) => {
      wx.previewImage({
        current: currentURL,
        fail: reject,
        success: resolve,
        urls: localPaths.filter(Boolean),
      });
    });
    return;
  }

  const accessURL = await resolveAttachmentAccess(attachment, {
    disposition: "inline",
    fileName: attachment.name,
  });
  if (!accessURL) {
    throw new Error("附件地址无效");
  }

  await downloadAndOpenAttachment(accessURL, attachment);
}

function detectAttachmentType(source) {
  const lower = String(source || "").split("#")[0].split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(lower)) {
    return "image";
  }
  if (lower.endsWith(".pdf")) {
    return "pdf";
  }
  return "file";
}

function extractAttachmentName(source) {
  const parts = String(source || "").split("#")[0].split("?")[0].split("/");
  return parts[parts.length - 1] || "附件";
}

function buildAttachmentKey(item) {
  if (item && item.bucket && item.objectKey) {
    return `oss:${item.bucket}:${item.objectKey}`;
  }
  if (item && item.objectKey) {
    return `object:${item.objectKey}`;
  }
  return `url:${String((item && item.url) || "").trim()}`;
}

function normalizeAttachmentItem(value) {
  if (typeof value === "string") {
    const trimmedURL = value.trim();
    if (!trimmedURL) {
      return null;
    }

    const name = normalizeAttachmentDisplayName("", trimmedURL, detectAttachmentType(trimmedURL));
    const extension = normalizeAttachmentExtension("", name, trimmedURL);
    return {
      bucket: "",
      extension,
      name,
      objectKey: "",
      size: 0,
      type: detectAttachmentType(extension || trimmedURL),
      url: trimmedURL,
    };
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const bucket = String(value.bucket || "").trim();
  const objectKey = String(value.objectKey || "").trim();
  const url = String(value.url || "").trim();
  if (!objectKey && !url) {
    return null;
  }

  const name = normalizeAttachmentDisplayName(value.name, objectKey || url, detectAttachmentType(value.extension || objectKey || url));
  const extension = normalizeAttachmentExtension(value.extension, name, objectKey || url);
  return {
    bucket,
    extension,
    name,
    objectKey,
    size: normalizeAttachmentSize(value.size),
    type: detectAttachmentType(extension || name || objectKey || url),
    url,
  };
}

function parseAttachmentValues(raw) {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw;
  }

  const text = String(raw || "").trim();
  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
  }

  return text
    .split(",")
    .map((item) =>
      item
        .trim()
        .replace(/^\[/, "")
        .replace(/\]$/, "")
        .replace(/^"/, "")
        .replace(/"$/, ""),
    )
    .filter(Boolean);
}

function normalizeAttachmentExtension(rawExtension, rawName, rawSource) {
  const extension = String(rawExtension || "").trim().toLowerCase();
  if (extension) {
    return extension.startsWith(".") ? extension : `.${extension}`;
  }

  const name = String(rawName || "").trim() || extractAttachmentName(rawSource);
  const extensionIndex = name.lastIndexOf(".");
  if (extensionIndex <= 0 || extensionIndex === name.length - 1) {
    return "";
  }

  return name.slice(extensionIndex).toLowerCase();
}

function normalizeAttachmentSize(rawSize) {
  const size = Number(rawSize);
  return Number.isFinite(size) && size > 0 ? size : 0;
}

function normalizeAttachmentDisplayName(rawName, rawSource, type) {
  const sourceName = String(rawName || "").trim() || extractAttachmentName(rawSource);
  if (!looksLikeOpaqueName(sourceName)) {
    return sourceName || "附件";
  }

  const extension = normalizeAttachmentExtension("", sourceName, rawSource);
  const baseName = type === "image" ? "图片" : "附件";
  return `${baseName}${extension || ""}`;
}

function looksLikeOpaqueName(fileName) {
  const normalized = String(fileName || "").trim();
  if (!normalized) {
    return true;
  }

  const baseName = normalized.replace(/\.[^.]+$/, "");
  if (!baseName) {
    return true;
  }

  return (
    /^tmp[_-]/i.test(baseName) ||
    /^[a-f0-9-]{20,}$/i.test(baseName) ||
    /^[a-z0-9]{24,}$/i.test(baseName)
  );
}

function resolveAttachmentAccess(item, options) {
  return getAttachmentAccessURL({
    bucket: item.bucket,
    disposition: options && options.disposition,
    fileName: options && options.fileName,
    objectKey: item.objectKey,
    url: item.url,
  }).then((result) => result.url || item.url || "");
}

async function resolveAttachmentPreviewFile(item) {
  const accessURL = await resolveAttachmentAccess(item, {
    disposition: "inline",
    fileName: item.name,
  });
  if (!accessURL) {
    throw new Error("图片地址无效");
  }

  const tempFilePath = await new Promise((resolve, reject) => {
    wx.downloadFile({
      success: (res) => {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          reject(new Error("下载失败"));
          return;
        }
        resolve(res.tempFilePath);
      },
      fail: () => reject(new Error("下载失败")),
      url: accessURL,
    });
  });
  return tempFilePath;
}

function downloadAndOpenAttachment(url, attachment) {
  return new Promise((resolve, reject) => {
    wx.showLoading({ title: "打开中..." });
    wx.downloadFile({
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode !== 200 || !res.tempFilePath) {
          reject(new Error("下载失败"));
          return;
        }

        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: resolveOpenDocumentType(attachment),
          showMenu: true,
          success: resolve,
          fail: () => reject(new Error("打开失败")),
        });
      },
      fail: () => {
        wx.hideLoading();
        reject(new Error("下载失败"));
      },
      url,
    });
  });
}

function resolveOpenDocumentType(attachment) {
  const extension = String((attachment && attachment.extension) || "").replace(/^\./, "").toLowerCase();
  return extension || undefined;
}

module.exports = {
  buildAttachmentCardItems,
  buildAttachmentFileList,
  createAttachmentRefFromUploadResult,
  detectAttachmentType,
  extractAttachmentName,
  normalizeAttachmentList,
  openAttachment,
  serializeAttachmentList,
};
