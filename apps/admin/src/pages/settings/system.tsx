import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContent } from "@/components/page-content";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  fetchRuntimeSettings,
  getDefaultRuntimeSettings,
  getSystemDisplayName,
  saveRuntimeSettings,
  type RuntimeSettings,
} from "@/lib/runtime-settings";

export default function SettingsSystemPage() {
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>(
    getDefaultRuntimeSettings(),
  );
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeSettings() {
      setLoadingSettings(true);
      try {
        const settings = await fetchRuntimeSettings();
        if (!cancelled) {
          setRuntimeSettings(settings);
        }
      } finally {
        if (!cancelled) {
          setLoadingSettings(false);
        }
      }
    }

    void loadRuntimeSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const systemNamePreview = useMemo(
    () => getSystemDisplayName(runtimeSettings.systemNamePrefix),
    [runtimeSettings.systemNamePrefix],
  );

  async function handleSaveRuntimeSettings() {
    setSavingSettings(true);
    try {
      const saved = await saveRuntimeSettings(runtimeSettings);
      setRuntimeSettings(saved);
      toast.success("系统设置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <PageContent>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">系统设置</h1>
          <p className="text-sm text-muted-foreground">管理后台系统基础配置</p>
        </div>
        <Separator />

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>系统名称前缀</CardTitle>
            <CardDescription>
              配置管理端左上角与登录页显示的系统名称前缀
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="system-name-prefix">系统名称前缀</Label>
              <Input
                id="system-name-prefix"
                disabled={loadingSettings || savingSettings}
                placeholder="例如：壹一小屋"
                value={runtimeSettings.systemNamePrefix}
                onChange={(event) =>
                  setRuntimeSettings((current) => ({
                    ...current,
                    systemNamePrefix: event.target.value,
                  }))
                }
              />
              <p className="text-sm text-muted-foreground">
                预览：{systemNamePreview}
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={loadingSettings || savingSettings}
                onClick={handleSaveRuntimeSettings}
              >
                {savingSettings ? "保存中..." : "保存系统设置"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
