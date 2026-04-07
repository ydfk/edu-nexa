declare module "ali-oss" {
  type OSSHeaders = Record<string, string>;

  type OSSPutOptions = {
    headers?: OSSHeaders;
    mime?: string;
  };

  type OSSSignatureRequest = {
    headers?: OSSHeaders;
    queries?: Record<string, string>;
  };

  type OSSOptions = {
    accessKeyId: string;
    accessKeySecret: string;
    authorizationV4?: boolean;
    bucket?: string;
    cname?: boolean;
    endpoint?: string;
    region: string;
    secure?: boolean;
    stsToken?: string;
  };

  export default class OSS {
    constructor(options: OSSOptions);

    put(name: string, file: Blob | File, options?: OSSPutOptions): Promise<unknown>;

    signatureUrlV4(
      method: string,
      expires: number,
      request?: OSSSignatureRequest,
      objectName?: string,
      additionalHeaders?: OSSHeaders,
    ): Promise<string>;
  }
}
