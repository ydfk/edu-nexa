import OSS from "ali-oss";

export type AliyunOSSBrowserUploadConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  expiration: string;
  objectKey: string;
  provider: string;
  publicURL: string;
  region: string;
  securityToken: string;
};

export async function uploadFileByAliyunOSS(
  file: File,
  config: AliyunOSSBrowserUploadConfig,
) {
  const client = new OSS({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    authorizationV4: true,
    bucket: config.bucket,
    region: config.region,
    secure: true,
    stsToken: config.securityToken,
  });

  await client.multipartUpload(config.objectKey, file, {
    headers: {
      "x-oss-forbid-overwrite": "true",
    },
    mime: resolveAliyunOSSMimeType(file),
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
