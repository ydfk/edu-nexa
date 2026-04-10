import { getAdminSessionSnapshot } from "@/lib/auth/session";

export type HomeBanner = {
  id: string;
  image: string;
  subtitle: string;
  title: string;
};

export type HomeConfig = {
  announcement: string;
  banners: HomeBanner[];
  heroSubtitle: string;
  heroTitle: string;
};

const defaultHomeConfig: HomeConfig = {
  announcement: "",
  banners: [
    {
      id: "banner-service",
      image: "",
      subtitle: "",
      title: "",
    },
    {
      id: "banner-feedback",
      image: "",
      subtitle: "",
      title: "",
    },
  ],
  heroSubtitle: "",
  heroTitle: "",
};

let mockHomeConfig = cloneHomeConfig(defaultHomeConfig);

export function getDefaultHomeConfig() {
  return cloneHomeConfig(defaultHomeConfig);
}

export async function fetchHomeConfig() {
  try {
    const response = await fetch("/api/home-config");
    const payload = await response.json();
    if (!response.ok || payload?.flag !== true || !payload.data) {
      return cloneHomeConfig(mockHomeConfig);
    }
    return normalizeHomeConfig(payload.data);
  } catch {
    return cloneHomeConfig(mockHomeConfig);
  }
}

export async function saveHomeConfig(config: HomeConfig) {
  const session = getAdminSessionSnapshot();
  if (session.user?.isDemo) {
    throw new Error("demo 环境仅支持查看数据，不能修改管理数据");
  }
  const normalized = normalizeHomeConfig(config);

  try {
    const response = await fetch("/api/home-config", {
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

    mockHomeConfig = normalizeHomeConfig(payload.data);
    return cloneHomeConfig(mockHomeConfig);
  } catch {
    mockHomeConfig = normalized;
    return cloneHomeConfig(mockHomeConfig);
  }
}

function normalizeHomeConfig(value: Partial<HomeConfig> | undefined) {
  const banners = Array.isArray(value?.banners) ? value.banners : defaultHomeConfig.banners;
  return {
    announcement: value?.announcement || defaultHomeConfig.announcement,
    banners: banners.map((item, index) => ({
      id: item.id || `banner-${index + 1}`,
      image: item.image || defaultHomeConfig.banners[index]?.image || "",
      subtitle: item.subtitle || "",
      title: item.title || "",
    })),
    heroSubtitle: value?.heroSubtitle || defaultHomeConfig.heroSubtitle,
    heroTitle: value?.heroTitle || defaultHomeConfig.heroTitle,
  };
}

function cloneHomeConfig(config: HomeConfig) {
  return JSON.parse(JSON.stringify(config)) as HomeConfig;
}
