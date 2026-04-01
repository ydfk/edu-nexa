import { getAdminSessionSnapshot } from "@/lib/auth/session";

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

export type MealRecordItem = {
  id: string;
  imageUrls: string[];
  recordedBy: string;
  recordedById: string;
  remark: string;
  serviceDate: string;
  status: string;
  studentId: string;
  studentName: string;
};

export type HomeworkRecordItem = {
  className: string;
  id: string;
  imageUrls: string[];
  recordedBy: string;
  recordedById: string;
  remark: string;
  schoolName: string;
  serviceDate: string;
  status: string;
  studentId: string;
  studentName: string;
  subjectSummary: string;
};

export type DailyHomeworkItem = {
  className: string;
  content: string;
  id: string;
  remark: string;
  schoolName: string;
  serviceDate: string;
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
  status: string;
}) {
  const path = input.id ? `/api/classes/${input.id}` : "/api/classes";
  return request<ClassItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function fetchGuardianProfiles(query?: ListQuery) {
  return request<GuardianProfileItem[]>("/api/guardian-profiles", { query });
}

export async function saveGuardianProfile(input: {
  id?: string;
  name: string;
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

export async function fetchStudents(query?: ListQuery) {
  return request<StudentItem[]>("/api/students", { query });
}

export async function saveStudent(input: {
  classId: string;
  className: string;
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

export async function fetchMealRecords(query?: ListQuery) {
  return request<MealRecordItem[]>("/api/meal-records", { query });
}

export async function saveMealRecord(input: {
  id?: string;
  imageUrls: string[];
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

export async function fetchHomeworkRecords(query?: ListQuery) {
  return request<HomeworkRecordItem[]>("/api/homework-records", { query });
}

export async function saveHomeworkRecord(input: {
  className: string;
  id?: string;
  imageUrls: string[];
  recordedBy: string;
  recordedById: string;
  remark: string;
  schoolName: string;
  serviceDate: string;
  status: string;
  studentId: string;
  studentName: string;
  subjectSummary: string;
}) {
  const path = input.id ? `/api/homework-records/${input.id}` : "/api/homework-records";
  return request<HomeworkRecordItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
  });
}

export async function fetchDailyHomework(query?: ListQuery) {
  return request<DailyHomeworkItem[]>("/api/daily-homework", { query });
}

export async function saveDailyHomework(input: {
  className: string;
  content: string;
  id?: string;
  remark: string;
  schoolName: string;
  serviceDate: string;
  teacherId: string;
  teacherName: string;
}) {
  const path = input.id ? `/api/daily-homework/${input.id}` : "/api/daily-homework";
  return request<DailyHomeworkItem>(path, {
    body: input,
    method: input.id ? "PUT" : "POST",
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

async function request<T>(
  path: string,
  options?: {
    body?: unknown;
    method?: "GET" | "POST" | "PUT";
    query?: ListQuery;
  }
) {
  const session = getAdminSessionSnapshot();
  const url = buildURL(path, options?.query);
  const response = await fetch(url, {
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: {
      Authorization: session.token ? `Bearer ${session.token}` : "",
      "Content-Type": options?.body ? "application/json" : "",
    },
    method: options?.method || "GET",
  });

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("接口响应解析失败");
  }

  if (!response.ok || !payload.flag) {
    throw new Error(payload?.msg || "接口请求失败");
  }

  return payload.data;
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
