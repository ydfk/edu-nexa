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
  announcement: "首页介绍、图片和公告都可以在后台统一配置。",
  banners: [
    {
      id: "banner-campus",
      image: "/assets/intro-campus.svg",
      subtitle: "首页介绍、图片和公告都可以在后台统一配置。",
      title: "机构介绍和服务说明先在首页讲清楚",
    },
    {
      id: "banner-feedback",
      image: "/assets/intro-feedback.svg",
      subtitle: "教师记录，监护人按日期查看，多学生家庭支持切换。",
      title: "晚辅用餐和作业反馈是当前两条主链路",
    },
  ],
  heroSubtitle: "首页介绍、用餐反馈、作业反馈都围绕晚辅主链路展开。",
  heroTitle: "教师记录，监护人查看。",
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
