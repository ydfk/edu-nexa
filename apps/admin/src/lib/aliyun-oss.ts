import OSS from "ali-oss";

export type AliyunOSSBrowserUploadConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  baseURL?: string;
  bucket: string;
  expiration: string;
  objectKey: string;
  provider: string;
  publicURL: string;
  region: string;
  securityToken: string;
};

type AliyunOSSAccessOptions = {
  disposition?: "attachment" | "inline";
  fileName?: string;
};

export async function uploadFileByAliyunOSS(
  file: File,
  config: AliyunOSSBrowserUploadConfig,
) {
  const client = createAliyunOSSClient(config);

  await client.put(config.objectKey, file, {
    headers: {
      "x-oss-forbid-overwrite": "true",
    },
    mime: resolveAliyunOSSMimeType(file),
  });
}

export async function createAliyunOSSAccessURL(
  objectKey: string,
  config: AliyunOSSBrowserUploadConfig,
  options?: AliyunOSSAccessOptions,
) {
  const client = createAliyunOSSAccessClient(config);
  const request: {
    queries?: Record<string, string>;
  } = {};
  const queries: Record<string, string> = {};

  if (options?.disposition === "attachment") {
    const fileName = options.fileName?.trim() || extractAliyunOSSFileName(objectKey);
    queries["response-content-disposition"] = buildAliyunOSSContentDisposition(fileName);
  }
  if (Object.keys(queries).length > 0) {
    request.queries = queries;
  }

  const rawURL = await client.signatureUrlV4("GET", 600, request, objectKey);
  return normalizeAliyunOSSAccessURL(rawURL);
}

function createAliyunOSSClient(config: AliyunOSSBrowserUploadConfig) {
  return new OSS({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    authorizationV4: true,
    bucket: config.bucket,
    region: config.region,
    secure: true,
    stsToken: config.securityToken,
  });
}

function createAliyunOSSAccessClient(config: AliyunOSSBrowserUploadConfig) {
  const endpoint = normalizeAliyunOSSBaseURL(config.baseURL);
  if (!endpoint) {
    return createAliyunOSSClient(config);
  }

  return new OSS({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    authorizationV4: true,
    bucket: config.bucket,
    cname: true,
    endpoint,
    region: config.region,
    secure: true,
    stsToken: config.securityToken,
  });
}

function resolveAliyunOSSMimeType(file: File) {
  if (file.type) {
    return file.type;
  }

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (lowerName.endsWith(".png")) {
    return "image/png";
  }
  if (lowerName.endsWith(".webp")) {
    return "image/webp";
  }
  if (lowerName.endsWith(".gif")) {
    return "image/gif";
  }
  if (lowerName.endsWith(".heic")) {
    return "image/heic";
  }
  return "image/jpeg";
}

function buildAliyunOSSContentDisposition(fileName: string) {
  return `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function extractAliyunOSSFileName(objectKey: string) {
  const segments = objectKey.split("/");
  return segments[segments.length - 1] || objectKey;
}

function normalizeAliyunOSSAccessURL(rawURL: string) {
  if (!rawURL.trim()) {
    return rawURL;
  }

  const url = new URL(rawURL);
  if (!url.protocol || url.protocol === "http:") {
    url.protocol = "https:";
  }
  return url.toString();
}

function normalizeAliyunOSSBaseURL(baseURL?: string) {
  const trimmedBaseURL = String(baseURL || "").trim();
  if (!trimmedBaseURL) {
    return "";
  }
  if (trimmedBaseURL.startsWith("http://") || trimmedBaseURL.startsWith("https://")) {
    return trimmedBaseURL;
  }

  return `https://${trimmedBaseURL}`;
}
