import { getAdminSessionSnapshot } from "@/lib/auth/session";

type ApiEnvelope<T> = {
  code: number;
  data: T;
  flag: boolean;
  msg?: string;
};

const apiBaseURL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export type CampusItem = {
  address: string;
  code: string;
  contactPerson: string;
  contactPhone: string;
  id: string;
  name: string;
  serviceEndAt: string;
  serviceStartAt: string;
  status: string;
};

export type StudentItem = {
  campusId: string;
  campusName: string;
  className: string;
  grade: string;
  guardianName: string;
  guardianPhone: string;
  id: string;
  name: string;
  schoolName: string;
  serviceSummary?: {
    paidAt?: string;
    paymentStatus?: string;
    serviceEndDate?: string;
    serviceStartDate?: string;
  };
  status: string;
};

export type MealRecordItem = {
  campusId: string;
  campusName: string;
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
  campusId: string;
  campusName: string;
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
  campusId: string;
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
  campusId: string;
  hasHomeworkService: boolean;
  hasMealService: boolean;
  id: string;
  remark: string;
  serviceDate: string;
};

export type OverviewItem = {
  alerts: Array<{ level: string; message: string; title: string }>;
  date: string;
  metrics: Array<{ key: string; label: string; value: number }>;
};

export async function fetchOverview() {
  return request<OverviewItem>("/api/overview");
}

export async function fetchCampuses() {
  return request<CampusItem[]>("/api/campuses");
}

export async function fetchStudents() {
  return request<StudentItem[]>("/api/students");
}

export async function fetchMealRecords() {
  return request<MealRecordItem[]>("/api/meal-records");
}

export async function fetchHomeworkRecords() {
  return request<HomeworkRecordItem[]>("/api/homework-records");
}

export async function fetchDailyHomework() {
  return request<DailyHomeworkItem[]>("/api/daily-homework");
}

export async function fetchServiceDays() {
  return request<ServiceDayItem[]>("/api/service-days");
}

async function request<T>(path: string) {
  const session = getAdminSessionSnapshot();
  const response = await fetch(`${apiBaseURL}${path}`, {
    headers: {
      Authorization: session.token ? `Bearer ${session.token}` : "",
    },
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
