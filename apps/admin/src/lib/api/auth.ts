import type { AdminSessionUser } from "@/lib/auth/session";

type ApiEnvelope<T> = {
  code: number;
  data: T;
  flag: boolean;
  msg?: string;
};

type LoginResponse = {
  loginType: "admin_password";
  token: string;
  user: AdminSessionUser;
};

type LoginInput = {
  phone: string;
  password: string;
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

async function parseEnvelope<T>(response: Response) {
  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("登录响应解析失败");
  }

  if (!response.ok) {
    throw new Error(payload?.msg || "登录失败");
  }

  if (!payload.flag) {
    throw new Error(payload.msg || "登录失败");
  }

  return payload.data;
}
