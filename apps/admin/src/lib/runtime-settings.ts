import { getAdminSessionSnapshot } from "@/lib/auth/session";

export type RuntimeSettings = {
  imageSecurityEnable: boolean;
  imageSecurityStrict: boolean;
  scene: string;
  textSecurityEnable: boolean;
  textSecurityStrict: boolean;
  uploadProvider: "local" | "aliyun_oss" | "upyun";
};

const defaultSettings: RuntimeSettings = {
  imageSecurityEnable: false,
  imageSecurityStrict: false,
  scene: "app-runtime",
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
  } catch {
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
    imageSecurityEnable: !!value?.imageSecurityEnable,
    imageSecurityStrict: !!value?.imageSecurityStrict,
    scene: value?.scene || defaultSettings.scene,
    textSecurityEnable: !!value?.textSecurityEnable,
    textSecurityStrict: !!value?.textSecurityStrict,
    uploadProvider,
  };
}

function cloneRuntimeSettings(settings: RuntimeSettings) {
  return JSON.parse(JSON.stringify(settings)) as RuntimeSettings;
}
