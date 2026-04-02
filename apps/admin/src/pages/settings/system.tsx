import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { PageContent } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
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
  parseHomeworkSubjects,
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

        <HomeworkSubjectsCard
          runtimeSettings={runtimeSettings}
          setRuntimeSettings={setRuntimeSettings}
          loading={loadingSettings}
          saving={savingSettings}
          onSave={handleSaveRuntimeSettings}
        />
      </div>
    </PageContent>
  );
}

// ---------------------------------------------------------------------------
// 作业科目管理
// ---------------------------------------------------------------------------

function HomeworkSubjectsCard({
  runtimeSettings,
  setRuntimeSettings,
  loading,
  saving,
  onSave,
}: {
  runtimeSettings: RuntimeSettings;
  setRuntimeSettings: React.Dispatch<React.SetStateAction<RuntimeSettings>>;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const [newSubject, setNewSubject] = useState("");
  const subjects = useMemo(
    () => parseHomeworkSubjects(runtimeSettings),
    [runtimeSettings],
  );

  function addSubject() {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    if (subjects.includes(trimmed)) {
      toast.error("科目已存在");
      return;
    }
    const updated = [...subjects, trimmed];
    setRuntimeSettings((current) => ({
      ...current,
      homeworkSubjects: JSON.stringify(updated),
    }));
    setNewSubject("");
  }

  function removeSubject(index: number) {
    const updated = subjects.filter((_, i) => i !== index);
    setRuntimeSettings((current) => ({
      ...current,
      homeworkSubjects: JSON.stringify(updated),
    }));
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>作业科目</CardTitle>
        <CardDescription>
          配置每日作业可选的科目类型，用于作业分类
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject, index) => (
            <Badge
              key={`${subject}-${index}`}
              variant="secondary"
              className="gap-1 px-3 py-1.5 text-sm"
            >
              {subject}
              <button
                type="button"
                className="ml-1 rounded-full hover:bg-muted"
                onClick={() => removeSubject(index)}
                disabled={loading || saving}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="输入新科目名称"
            value={newSubject}
            disabled={loading || saving}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSubject();
              }
            }}
          />
          <Button
            variant="outline"
            size="icon"
            disabled={loading || saving || !newSubject.trim()}
            onClick={addSubject}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex justify-end">
          <Button disabled={loading || saving} onClick={onSave}>
            {saving ? "保存中..." : "保存科目设置"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}