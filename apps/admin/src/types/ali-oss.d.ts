declare module "ali-oss" {
  export type AliyunOSSMultipartUploadOptions = {
    headers?: Record<string, string>;
    mime?: string;
    progress?: (percentage: number, checkpoint?: unknown, response?: unknown) => void | Promise<void>;
  };

  export type AliyunOSSOptions = {
    accessKeyId: string;
    accessKeySecret: string;
    authorizationV4?: boolean;
    bucket: string;
    region: string;
    secure?: boolean;
    stsToken: string;
  };

  export default class OSS {
    constructor(options: AliyunOSSOptions);

    multipartUpload(
      name: string,
      file: Blob | File,
      options?: AliyunOSSMultipartUploadOptions,
    ): Promise<unknown>;
  }
}
