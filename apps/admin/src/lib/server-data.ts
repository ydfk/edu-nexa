import { expireAdminSession, getAdminSessionSnapshot } from "@/lib/auth/session";
import {
  type AliyunOSSBrowserUploadConfig,
  uploadFileByAliyunOSS,
} from "@/lib/aliyun-oss";

type ApiEnvelope<T> = {
  code: number;
  data: T;
  flag: boolean;
  msg?: string;
};

const apiBaseURL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export type UserItem = {
  displayName: string;
  id: string;
  phone: string;
  roles: string[];
  status: string;
};

export type SchoolItem = {
  id: string;
  name: string;
  status: string;
};

export type GradeItem = {
  id: string;
  name: string;
  sort: number;
  status: string;
};

export type ClassItem = {
  gradeId: string;
  gradeName: string;
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
  sort: number;
  status: string;
};

export type GuardianProfileItem = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  remark: string;
  status: string;
  userId?: string;
};

export type StudentItem = {
  classId: string;
  className: string;
  gender?: string;
  grade: string;
  gradeId: string;
  guardianId: string;
  guardianName: string;
  guardianPhone: string;
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
  serviceSummary?: {
    paidAt?: string;
    paymentAmount?: number;
    paymentStatus?: string;
    serviceEndDate?: string;
    serviceStartDate?: string;
  };
  status: string;
};

export type StudentServiceItem = {
  id: string;
  paidAt: string;
  paymentAmount: number;
  paymentStatus: string;
  remark: string;
  serviceEndDate: string;
  serviceStartDate: string;
  studentId: string;
};

export type PaymentRecordItem = {
  classId: string;
  className: string;
  gradeId: string;
  gradeName: string;
  guardianId: string;
  guardianName: string;
  guardianPhone: string;
  id: string;
  paidAt: string;
  paymentAmount: number;
  paymentType: string;
  periodEndDate: string;
  periodStartDate: string;
  refundAmount: number;
  refundedAt: string;
  refundRemark: string;
  remark: string;
  schoolId: string;
  schoolName: string;
  status: string;
  studentId: string;
  studentName: string;
};

export type MealRecordItem = {
  id: string;
  imageUrls: AttachmentReference[];
  recordedBy: string;
  recordedById: string;
  remark: string;
  serviceDate: string;
  status: string;
  studentId: string;
  studentName: string;
};

export type HomeworkRecordItem = {
  assignmentId: string;
  className: string;
  id: string;
  imageUrls: AttachmentReference[];
  recordedBy: string;
  recordedById: string;
  remark: string;
  schoolName: string;
  serviceDate: string;
  status: string;
  studentId: string;
  studentName: string;
  subject: string;
  subjectSummary: string;
};

export type HomeworkContentItem = {
  assignmentId: string;
  content: string;
  id: string;
  sort: number;
};

export type AttachmentReference = {
  bucket?: string;
  extension?: string;
  name?: string;
  objectKey?: string;
  size?: number;
  url?: string;
};

export type DailyHomeworkAttachment = {
  bucket: string;
  extension: string;
  name: string;
  objectKey: string;
  size: number;
};

export type DailyHomeworkItem = {
  attachments: DailyHomeworkAttachment[];
  classId: string;
  className: string;
  content: string;
  gradeName: string;
  id: string;
  items?: HomeworkContentItem[];
  remark: string;
  schoolId: string;
  schoolName: string;
  serviceDate: string;
  subject: string;
  teacherId: string;
  teacherName: string;
};

export type ServiceDayItem = {
  hasDaytimeHomeworkService: boolean;
  hasDinnerService: boolean;
  hasEveningHomeworkService: boolean;
  hasHomeworkService: boolean;
  hasLunchService: boolean;
  hasMealService: boolean;
  id: string;
  remark: string;
  serviceDate: string;
  workHours: string;
};

export type OverviewItem = {
  alerts: Array<{ level: string; message: string; title: string }>;
  date: string;
  metrics: Array<{ key: string; label: string; value: number }>;
};

export type ListQuery = Record<string, string | number | undefined>;

export async function fetchOverview() {
  return request<OverviewItem>("/api/overview");
}

export async function fetchUsers(query?: ListQuery) {
  return request<UserItem[]>("/api/users", { query });
}

export async function createUser(input: {
  displayName: string;
  password: string;
  phone: string;
  roles: string[];
  status: string;
}) {
  return request<UserItem>("/api/users", {
    body: input,
    method: "POST",
  });
}

export async function updateUser(
  id: string,
  input: {
    displayName: string;
    phone: string;
    roles: string[];
    status: string;
  }
) {
  return request<UserItem>(`/api/users/${id}`, {
    body: input,
    method: "PUT",
  });
}

export async function resetUserPassword(id: string, password: string) {
  return request<UserItem>(`/api/users/${id}/reset-password`, {
    body: { password },
    method: "POST",
  });
}

export async function fetchSchools(query?: ListQuery) {
  return request<SchoolItem[]>("/api/schools", { query });
}

export async function saveSchool(input: { id?: string; name: string; status: string }) {
  const path = input.id ? `/api/schools/${input.id}` : "/api/schools";
  return request<SchoolItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function deleteSchool(id: string) {
  return request<{ id: string }>(`/api/schools/${id}`, {
    method: "DELETE",
  });
}

export async function fetchGrades(query?: ListQuery) {
  return request<GradeItem[]>("/api/grades", { query });
}

export async function saveGrade(input: {
  id?: string;
  name: string;
  sort: number;
  status: string;
}) {
  const path = input.id ? `/api/grades/${input.id}` : "/api/grades";
  return request<GradeItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function deleteGrade(id: string) {
  return request<{ id: string }>(`/api/grades/${id}`, {
    method: "DELETE",
  });
}

export async function fetchClasses(query?: ListQuery) {
  return request<ClassItem[]>("/api/classes", { query });
}

export async function saveClass(input: {
  gradeId: string;
  gradeName: string;
  id?: string;
  name: string;
  schoolId: string;
  schoolName: string;
  sort: number;
  status: string;
}) {
  const path = input.id ? `/api/classes/${input.id}` : "/api/classes";
  return request<ClassItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function deleteClass(id: string) {
  return request<{ id: string }>(`/api/classes/${id}`, {
    method: "DELETE",
  });
}

export async function fetchGuardianProfiles(query?: ListQuery) {
  return request<GuardianProfileItem[]>("/api/guardian-profiles", { query });
}

export async function saveGuardianProfile(input: {
  id?: string;
  name: string;
  password?: string;
  phone: string;
  relationship: string;
  remark: string;
  status: string;
}) {
  const path = input.id ? `/api/guardian-profiles/${input.id}` : "/api/guardian-profiles";
  return request<GuardianProfileItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function deleteGuardianProfile(id: string) {
  return request<{ id: string }>(`/api/guardian-profiles/${id}`, {
    method: "DELETE",
  });
}

export async function fetchStudents(query?: ListQuery) {
  return request<StudentItem[]>("/api/students", { query });
}

export async function saveStudent(input: {
  classId: string;
  className: string;
  gender: string;
  grade: string;
  gradeId: string;
  guardianId: string;
  guardianName: string;
  guardianPhone: string;
  id?: string;
  name: string;
  schoolId: string;
  schoolName: string;
  status: string;
}) {
  const path = input.id ? `/api/students/${input.id}` : "/api/students";
  return request<StudentItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function deleteStudent(id: string) {
  return request<{ id: string }>(`/api/students/${id}`, {
    method: "DELETE",
  });
}

export async function fetchStudentServices(query?: ListQuery) {
  return request<StudentServiceItem[]>("/api/student-services", { query });
}

export async function saveStudentService(input: {
  id?: string;
  paidAt: string;
  paymentAmount: number;
  paymentStatus: string;
  remark: string;
  serviceEndDate: string;
  serviceStartDate: string;
  studentId: string;
}) {
  const path = input.id ? `/api/student-services/${input.id}` : "/api/student-services";
  return request<StudentServiceItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function deleteStudentService(id: string) {
  return request<{ id: string }>(`/api/student-services/${id}`, {
    method: "DELETE",
  });
}

export async function fetchPaymentRecords(query?: ListQuery) {
  return request<PaymentRecordItem[]>("/api/payment-records", { query });
}

export async function savePaymentRecord(input: {
  id?: string;
  paidAt: string;
  paymentAmount: number;
  paymentType: string;
  periodEndDate: string;
  periodStartDate: string;
  refundAmount: number;
  refundedAt: string;
  refundRemark: string;
  remark: string;
  studentId: string;
}) {
  const path = input.id ? `/api/payment-records/${input.id}` : "/api/payment-records";
  return request<PaymentRecordItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function deletePaymentRecord(id: string) {
  return request<{ id: string }>(`/api/payment-records/${id}`, {
    method: "DELETE",
  });
}

export async function fetchMealRecords(query?: ListQuery) {
  return request<MealRecordItem[]>("/api/meal-records", { query });
}

export async function saveMealRecord(input: {
  id?: string;
  imageUrls: AttachmentReference[];
  recordedBy: string;
  recordedById: string;
  remark: string;
  serviceDate: string;
  status: string;
  studentId: string;
  studentName: string;
}) {
  const path = input.id ? `/api/meal-records/${input.id}` : "/api/meal-records";
  return request<MealRecordItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function deleteMealRecord(id: string) {
  return request<{ id: string }>(`/api/meal-records/${id}`, {
    method: "DELETE",
  });
}

export async function fetchHomeworkRecords(query?: ListQuery) {
  return request<HomeworkRecordItem[]>("/api/homework-records", { query });
}

export async function saveHomeworkRecord(input: {
  assignmentId?: string;
  className: string;
  id?: string;
  imageUrls: AttachmentReference[];
  recordedBy: string;
  recordedById: string;
  remark: string;
  schoolName: string;
  serviceDate: string;
  status: string;
  studentId: string;
  studentName: string;
  subject?: string;
  subjectSummary: string;
}) {
  const path = input.id ? `/api/homework-records/${input.id}` : "/api/homework-records";
  return request<HomeworkRecordItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function deleteHomeworkRecord(id: string) {
  return request<{ id: string }>(`/api/homework-records/${id}`, {
    method: "DELETE",
  });
}

export async function fetchDailyHomework(query?: ListQuery) {
  return request<DailyHomeworkItem[]>("/api/daily-homework", { query });
}

export async function fetchDailyHomeworkPrintPDF(query?: ListQuery) {
  return request<{
    bucket?: string;
    objectKey?: string;
    path: string;
    provider?: string;
    serviceDate: string;
    url: string;
  }>(
    "/api/daily-homework/print-pdf",
    { query },
  );
}

export async function saveDailyHomework(input: {
  attachments?: DailyHomeworkAttachment[];
  classId: string;
  className: string;
  content: string;
  gradeName: string;
  id?: string;
  items?: Array<{ content: string }>;
  remark: string;
  schoolId: string;
  schoolName: string;
  serviceDate: string;
  subject?: string;
  teacherId: string;
  teacherName: string;
}) {
  const path = input.id ? `/api/daily-homework/${input.id}` : "/api/daily-homework";
  return request<DailyHomeworkItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function deleteDailyHomework(id: string) {
  return request<{ id: string }>(`/api/daily-homework/${id}`, {
    method: "DELETE",
  });
}

export async function fetchServiceDays(query?: ListQuery) {
  return request<ServiceDayItem[]>("/api/service-days", { query });
}

export async function saveServiceDay(input: {
  hasDaytimeHomeworkService: boolean;
  hasDinnerService: boolean;
  hasEveningHomeworkService: boolean;
  hasHomeworkService: boolean;
  hasLunchService: boolean;
  hasMealService: boolean;
  id?: string;
  remark: string;
  serviceDate: string;
  workHours: string;
}) {
  const path = input.id ? `/api/service-days/${input.id}` : "/api/service-days";
  return request<ServiceDayItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function deleteUser(id: string) {
  return request<{ id: string }>(`/api/users/${id}`, {
    method: "DELETE",
  });
}

export type UploadResult = {
  bucket: string;
  extension: string;
  name: string;
  objectKey: string;
  provider: string;
  size: number;
  url: string;
};

export async function uploadFile(file: File, purpose = "homework"): Promise<UploadResult> {
  try {
    const uploadConfig = await request<AliyunOSSBrowserUploadConfig>("/api/uploads/aliyun-sts", {
      query: {
        contentType: file.type,
        fileName: file.name,
        fileSize: file.size,
        purpose,
      },
    });

    try {
      await uploadFileByAliyunOSS(file, uploadConfig);

      return {
        bucket: uploadConfig.bucket,
        extension: extractFileExtension(file.name),
        name: file.name,
        objectKey: uploadConfig.objectKey,
        provider: uploadConfig.provider,
        size: file.size,
        url: uploadConfig.publicURL,
      };
    } catch {
      return uploadFileBySignedURL(file, purpose);
    }
  } catch (error) {
    if (!shouldFallbackToSignedUpload(error)) {
      throw error;
    }
  }

  return uploadFileBySignedURL(file, purpose);
}

export async function resolveAttachmentAccessURL(
  reference: string | AttachmentReference,
  options?: {
    disposition?: "attachment" | "inline";
    fileName?: string;
  },
) {
  const normalizedReference = normalizeAttachmentReference(reference);
  if (!normalizedReference) {
    return "";
  }

  const result = await request<{
    url?: string;
  }>("/api/uploads/access-url", {
    query: {
      bucket: normalizedReference.bucket,
      disposition: options?.disposition,
      fileName: options?.disposition === "attachment" ? options?.fileName : undefined,
      objectKey: normalizedReference.objectKey,
      url: normalizedReference.url,
    },
  });
  return result.url || normalizedReference.url || "";
}

async function request<T>(
  path: string,
  options?: {
    body?: unknown;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    query?: ListQuery;
  }
) {
  const session = getAdminSessionSnapshot();
  const requestMethod = options?.method || "GET";
  const url = buildURL(path, options?.query);
  const response = await fetch(url, {
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: {
      Authorization: session.token ? `Bearer ${session.token}` : "",
      "Content-Type": options?.body ? "application/json" : "",
    },
    method: requestMethod,
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("接口响应解析失败");
  }

  if (response.status === 401) {
    expireAdminSession();
  }

  if (!response.ok || !payload.flag) {
    throw new Error(payload?.msg || "接口请求失败");
  }

  return payload.data;
}

async function uploadFileBySignedURL(file: File, purpose: string): Promise<UploadResult> {
  const uploadConfig = await request<{
    bucket: string;
    headers: Record<string, string>;
    method: "PUT";
    objectKey: string;
    provider: string;
    publicURL: string;
    uploadURL: string;
  }>("/api/uploads/direct-upload-url", {
    query: {
      contentType: file.type,
      fileName: file.name,
      fileSize: file.size,
      purpose,
    },
  });

  const response = await fetch(uploadConfig.uploadURL, {
    body: file,
    headers: uploadConfig.headers,
    method: uploadConfig.method,
  });

  if (!response.ok) {
    throw new Error("上传到 OSS 失败");
  }

  return {
    bucket: uploadConfig.bucket,
    extension: extractFileExtension(file.name),
    name: file.name,
    objectKey: uploadConfig.objectKey,
    provider: uploadConfig.provider,
    size: file.size,
    url: uploadConfig.publicURL,
  };
}

function shouldFallbackToSignedUpload(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return [
    "当前上传存储未配置为阿里云 OSS",
    "阿里云 OSS STS 角色 ARN 未配置",
    "阿里云 OSS 配置不完整",
  ].some((message) => error.message.includes(message));
}

function normalizeAttachmentReference(reference: string | AttachmentReference) {
  if (typeof reference === "string") {
    const trimmed = reference.trim();
    if (!trimmed) {
      return null;
    }

    return { url: trimmed };
  }

  const bucket = reference.bucket?.trim();
  const extension = reference.extension?.trim();
  const name = reference.name?.trim();
  const objectKey = reference.objectKey?.trim();
  const size = typeof reference.size === "number" && Number.isFinite(reference.size)
    ? Math.max(reference.size, 0)
    : undefined;
  const url = reference.url?.trim();
  if (!bucket && !objectKey && !url) {
    return null;
  }

  return {
    bucket,
    extension,
    name,
    objectKey,
    size,
    url,
  };
}

function buildURL(path: string, query?: ListQuery) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }
    params.set(key, String(value));
  });

  const suffix = params.toString();
  return `${apiBaseURL}${path}${suffix ? `?${suffix}` : ""}`;
}

function extractFileExtension(fileName: string) {
  const normalizedFileName = fileName.trim();
  const extensionIndex = normalizedFileName.lastIndexOf(".");
  if (extensionIndex <= 0 || extensionIndex === normalizedFileName.length - 1) {
    return "";
  }

  return normalizedFileName.slice(extensionIndex).toLowerCase();
}
