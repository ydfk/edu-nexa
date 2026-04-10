import {
  expireAdminSession,
  getAdminSessionSnapshot,
  type AdminSessionUser,
} from "@/lib/auth/session";

type ApiEnvelope<T> = {
  code: number;
  data: T;
  flag: boolean;
  msg?: string;
};

type LoginResponse = {
  loginType: "admin_password" | "demo_password";
  token: string;
  user: AdminSessionUser;
};

type LoginInput = {
  phone: string;
  password: string;
};

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

const apiBaseURL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function loginWithPassword(input: LoginInput) {
  const response = await fetch(`${apiBaseURL}/api/auth/login`, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseEnvelope<LoginResponse>(response);
}

export async function updateProfile(input: { displayName: string }) {
  const session = getAdminSessionSnapshot();
  const response = await fetch(`${apiBaseURL}/api/auth/profile`, {
    body: JSON.stringify(input),
    headers: {
      Authorization: session.token ? `Bearer ${session.token}` : "",
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  return parseEnvelope<AdminSessionUser>(response);
}

export async function changePassword(input: ChangePasswordInput) {
  const session = getAdminSessionSnapshot();
  const response = await fetch(`${apiBaseURL}/api/auth/change-password`, {
    body: JSON.stringify(input),
    headers: {
      Authorization: session.token ? `Bearer ${session.token}` : "",
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseEnvelope<{ success: boolean }>(response);
}

async function parseEnvelope<T>(response: Response) {
  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("登录响应解析失败");
  }

  if (response.status === 401) {
    expireAdminSession();
  }

  if (!response.ok) {
    throw new Error(payload?.msg || "登录失败");
  }

  if (!payload.flag) {
    throw new Error(payload.msg || "登录失败");
  }

  return payload.data;
}
