import { getAdminSessionSnapshot } from "@/lib/auth/session";

export type RuntimeSettings = {
  homeworkSubjects: string;
  imageSecurityEnable: boolean;
  imageSecurityStrict: boolean;
  scene: string;
  systemNamePrefix: string;
  textSecurityEnable: boolean;
  textSecurityStrict: boolean;
  uploadProvider: "local" | "aliyun_oss" | "upyun";
};

const defaultHomeworkSubjects = '["语文","数学","英语","其他"]';

const defaultSettings: RuntimeSettings = {
  homeworkSubjects: defaultHomeworkSubjects,
  imageSecurityEnable: false,
  imageSecurityStrict: false,
  scene: "app-runtime",
  systemNamePrefix: "",
  textSecurityEnable: false,
  textSecurityStrict: false,
  uploadProvider: "local",
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

function normalizeRuntimeSettings(
  value: Partial<RuntimeSettings> | undefined
): RuntimeSettings {
  const uploadProvider =
    value?.uploadProvider === "aliyun_oss" ||
    value?.uploadProvider === "upyun" ||
    value?.uploadProvider === "local"
      ? value.uploadProvider
      : "local";

  return {
    homeworkSubjects: value?.homeworkSubjects || defaultHomeworkSubjects,
    imageSecurityEnable: !!value?.imageSecurityEnable,
    imageSecurityStrict: !!value?.imageSecurityStrict,
    scene: value?.scene || defaultSettings.scene,
    systemNamePrefix: (value?.systemNamePrefix || "").trim(),
    textSecurityEnable: !!value?.textSecurityEnable,
    textSecurityStrict: !!value?.textSecurityStrict,
    uploadProvider,
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
