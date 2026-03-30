import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchHomeConfig,
  getDefaultHomeConfig,
  saveHomeConfig,
  type HomeConfig,
} from "@/lib/home-config";

export default function HomeContentPage() {
  const [config, setConfig] = useState<HomeConfig>(getDefaultHomeConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchHomeConfig()
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setConfig(payload);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("读取首页配置失败，已回退到默认内容");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = await saveHomeConfig(config);
      setConfig(payload);
      toast.success("首页配置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function handleConfigChange(field: keyof HomeConfig, value: string) {
    setConfig((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleBannerChange(index: number, field: "title" | "subtitle" | "image", value: string) {
    setConfig((current) => ({
      ...current,
      banners: current.banners.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <Card className="border-none bg-card/90 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">小程序首页配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="heroTitle">首页主标题</Label>
            <Input
              id="heroTitle"
              disabled={loading}
              value={config.heroTitle}
              onChange={(event) => handleConfigChange("heroTitle", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">首页副标题</Label>
            <Textarea
              id="heroSubtitle"
              disabled={loading}
              value={config.heroSubtitle}
              onChange={(event) => handleConfigChange("heroSubtitle", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement">首页公告</Label>
            <Textarea
              id="announcement"
              disabled={loading}
              value={config.announcement}
              onChange={(event) => handleConfigChange("announcement", event.target.value)}
            />
          </div>

          {config.banners.map((banner, index) => (
            <div key={banner.id} className="space-y-4 rounded-2xl border p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ImagePlus className="size-4" />
                轮播图 {index + 1}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`banner-title-${index}`}>标题</Label>
                <Input
                  id={`banner-title-${index}`}
                  disabled={loading}
                  value={banner.title}
                  onChange={(event) => handleBannerChange(index, "title", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`banner-subtitle-${index}`}>说明</Label>
                <Textarea
                  id={`banner-subtitle-${index}`}
                  disabled={loading}
                  value={banner.subtitle}
                  onChange={(event) =>
                    handleBannerChange(index, "subtitle", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`banner-image-${index}`}>图片地址</Label>
                <Input
                  id={`banner-image-${index}`}
                  disabled={loading}
                  value={banner.image}
                  onChange={(event) => handleBannerChange(index, "image", event.target.value)}
                />
              </div>
            </div>
          ))}

          <Button disabled={loading || saving} onClick={handleSave}>
            {saving ? "保存中..." : "保存首页配置"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none bg-card/90 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">预览摘要</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-3xl bg-[linear-gradient(135deg,_rgba(37,99,235,0.96),_rgba(22,59,140,0.98))] p-5 text-white">
            <p className="text-2xl font-semibold leading-tight">{config.heroTitle}</p>
            <p className="mt-3 text-sm text-white/80">{config.heroSubtitle}</p>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
            {config.announcement}
          </div>
          {config.banners.map((banner) => (
            <div key={banner.id} className="rounded-2xl border p-4">
              <p className="font-medium">{banner.title || "未填写标题"}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {banner.subtitle || "未填写说明"}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                图片：{banner.image || "未填写"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
