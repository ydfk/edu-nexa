import { getAdminSessionSnapshot } from "@/lib/auth/session";

export type RuntimeSettings = {
  homeworkSubjects: string;
  paymentTypes: string;
  imageSecurityEnable: boolean;
  imageSecurityStrict: boolean;
  scene: string;
  systemNamePrefix: string;
  textSecurityEnable: boolean;
  textSecurityStrict: boolean;
  demoTeacherName: string;
  demoTeacherPhone: string;
  demoTeacherPassword: string;
  demoGuardianName: string;
  demoGuardianPhone: string;
  demoGuardianPassword: string;
};

const defaultHomeworkSubjects = '["语文","数学","英语","其他"]';
const defaultPaymentTypes = '["晚餐+晚辅","打印费"]';

const defaultSettings: RuntimeSettings = {
  homeworkSubjects: defaultHomeworkSubjects,
  paymentTypes: defaultPaymentTypes,
  imageSecurityEnable: false,
  imageSecurityStrict: false,
  scene: "app-runtime",
  systemNamePrefix: "",
  textSecurityEnable: false,
  textSecurityStrict: false,
  demoTeacherName: "演示教师",
  demoTeacherPhone: "18800000001",
  demoTeacherPassword: "123456",
  demoGuardianName: "演示家长",
  demoGuardianPhone: "18800000002",
  demoGuardianPassword: "123456",
};

let mockRuntimeSettings = cloneRuntimeSettings(defaultSettings);

export function getDefaultRuntimeSettings() {
  return cloneRuntimeSettings(defaultSettings);
}

export async function fetchRuntimeSettings() {
  const session = getAdminSessionSnapshot();

  try {
    const response = await fetch("/api/runtime-settings", {
      headers: {
        Authorization: session.token ? `Bearer ${session.token}` : "",
      },
    });
    const payload = await response.json();
    if (!response.ok || payload?.flag !== true || !payload.data) {
      return cloneRuntimeSettings(mockRuntimeSettings);
    }

    mockRuntimeSettings = normalizeRuntimeSettings(payload.data);
    return cloneRuntimeSettings(mockRuntimeSettings);
  } catch {
    return cloneRuntimeSettings(mockRuntimeSettings);
  }
}

export async function saveRuntimeSettings(settings: RuntimeSettings) {
  const session = getAdminSessionSnapshot();
  const normalized = normalizeRuntimeSettings(settings);

  try {
    const response = await fetch("/api/runtime-settings", {
      body: JSON.stringify(normalized),
      headers: {
        "Content-Type": "application/json",
        Authorization: session.token ? `Bearer ${session.token}` : "",
      },
      method: "PUT",
    });
    const payload = await response.json();
    if (!response.ok || payload?.flag !== true || !payload.data) {
      throw new Error(payload?.msg || "保存失败");
    }

    mockRuntimeSettings = normalizeRuntimeSettings(payload.data);
    return cloneRuntimeSettings(mockRuntimeSettings);
  } catch (error) {
    if (session.token) {
      throw error;
    }

    mockRuntimeSettings = normalized;
    return cloneRuntimeSettings(mockRuntimeSettings);
  }
}

export async function fetchAdminRuntimeSettings() {
  const session = getAdminSessionSnapshot();
  const response = await fetch("/api/runtime-settings/admin", {
    headers: {
      Authorization: session.token ? `Bearer ${session.token}` : "",
    },
  });
  const payload = await response.json();
  if (!response.ok || payload?.flag !== true || !payload.data) {
    throw new Error(payload?.msg || "读取系统设置失败");
  }

  mockRuntimeSettings = normalizeRuntimeSettings(payload.data);
  return cloneRuntimeSettings(mockRuntimeSettings);
}

export async function saveAdminRuntimeSettings(settings: RuntimeSettings) {
  const session = getAdminSessionSnapshot();
  const normalized = normalizeRuntimeSettings(settings);
  const response = await fetch("/api/runtime-settings", {
    body: JSON.stringify(normalized),
    headers: {
      "Content-Type": "application/json",
      Authorization: session.token ? `Bearer ${session.token}` : "",
    },
    method: "PUT",
  });
  const payload = await response.json();
  if (!response.ok || payload?.flag !== true || !payload.data) {
    throw new Error(payload?.msg || "保存失败");
  }

  mockRuntimeSettings = normalizeRuntimeSettings(payload.data);
  return cloneRuntimeSettings(mockRuntimeSettings);
}

export async function initializeDemoEnvironment() {
  const session = getAdminSessionSnapshot();
  const response = await fetch("/api/runtime-settings/demo/initialize", {
    headers: {
      Authorization: session.token ? `Bearer ${session.token}` : "",
    },
    method: "POST",
  });
  const payload = await response.json();
  if (!response.ok || payload?.flag !== true || !payload.data) {
    throw new Error(payload?.msg || "初始化 demo 数据失败");
  }

  return payload.data as RuntimeSettings;
}

function normalizeRuntimeSettings(
  value: Partial<RuntimeSettings> | undefined
): RuntimeSettings {
  return {
    homeworkSubjects: value?.homeworkSubjects || defaultHomeworkSubjects,
    paymentTypes: value?.paymentTypes || defaultPaymentTypes,
    imageSecurityEnable: !!value?.imageSecurityEnable,
    imageSecurityStrict: !!value?.imageSecurityStrict,
    scene: value?.scene || defaultSettings.scene,
    systemNamePrefix: (value?.systemNamePrefix || "").trim(),
    textSecurityEnable: !!value?.textSecurityEnable,
    textSecurityStrict: !!value?.textSecurityStrict,
    demoTeacherName: (value?.demoTeacherName || defaultSettings.demoTeacherName).trim(),
    demoTeacherPhone: (value?.demoTeacherPhone || defaultSettings.demoTeacherPhone).trim(),
    demoTeacherPassword: (value?.demoTeacherPassword || defaultSettings.demoTeacherPassword).trim(),
    demoGuardianName: (value?.demoGuardianName || defaultSettings.demoGuardianName).trim(),
    demoGuardianPhone: (value?.demoGuardianPhone || defaultSettings.demoGuardianPhone).trim(),
    demoGuardianPassword: (value?.demoGuardianPassword || defaultSettings.demoGuardianPassword).trim(),
  };
}

export function getSystemDisplayName(prefix?: string) {
  const brandSuffix = "学栖·EduNexa";
  const normalizedPrefix = (prefix || "").trim();
  if (!normalizedPrefix) {
    return brandSuffix;
  }
  if (
    normalizedPrefix === brandSuffix ||
    normalizedPrefix === "学栖" ||
    normalizedPrefix.toLowerCase() === "edunexa"
  ) {
    return brandSuffix;
  }
  if (normalizedPrefix.includes(brandSuffix)) {
    return normalizedPrefix;
  }

  return `${normalizedPrefix} ${brandSuffix}`;
}

export function getSystemBrandParts(prefix?: string) {
  const brandSuffix = "学栖·EduNexa";
  const normalizedPrefix = (prefix || "").trim();

  if (
    !normalizedPrefix ||
    normalizedPrefix === brandSuffix ||
    normalizedPrefix === "学栖" ||
    normalizedPrefix.toLowerCase() === "edunexa"
  ) {
    return {
      primary: brandSuffix,
      secondary: "",
    };
  }

  if (normalizedPrefix.includes(brandSuffix)) {
    const primary = normalizedPrefix.replace(brandSuffix, "").trim();
    return {
      primary: primary || brandSuffix,
      secondary: primary ? brandSuffix : "",
    };
  }

  return {
    primary: normalizedPrefix,
    secondary: brandSuffix,
  };
}

function cloneRuntimeSettings(settings: RuntimeSettings) {
  return JSON.parse(JSON.stringify(settings)) as RuntimeSettings;
}

export function parseHomeworkSubjects(settings: RuntimeSettings): string[] {
  try {
    const parsed = JSON.parse(settings.homeworkSubjects);
    if (Array.isArray(parsed)) return parsed.filter((s: unknown) => typeof s === "string" && s.trim());
  } catch {
    // ignore
  }
  return ["语文", "数学", "英语", "其他"];
}

export function parsePaymentTypes(settings: RuntimeSettings): string[] {
  try {
    const parsed = JSON.parse(settings.paymentTypes);
    if (Array.isArray(parsed)) {
      return parsed.filter((item: unknown) => typeof item === "string" && item.trim());
    }
  } catch {
    // ignore
  }
  return ["晚餐+晚辅", "打印费"];
}
