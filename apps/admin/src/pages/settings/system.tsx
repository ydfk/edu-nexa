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
  fetchAdminRuntimeSettings,
  getDefaultRuntimeSettings,
  parsePaymentTypes,
  getSystemDisplayName,
  initializeDemoEnvironment,
  parseHomeworkSubjects,
  saveAdminRuntimeSettings,
  type RuntimeSettings,
} from "@/lib/runtime-settings";

export default function SettingsSystemPage() {
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>(
    getDefaultRuntimeSettings(),
  );
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [initializingDemo, setInitializingDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeSettings() {
      setLoadingSettings(true);
      try {
        const settings = await fetchAdminRuntimeSettings();
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
      const saved = await saveAdminRuntimeSettings(runtimeSettings);
      setRuntimeSettings(saved);
      toast.success("系统设置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleInitializeDemo() {
    setInitializingDemo(true);
    try {
      await saveAdminRuntimeSettings(runtimeSettings);
      await initializeDemoEnvironment();
      toast.success("demo 数据已初始化");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "初始化失败");
    } finally {
      setInitializingDemo(false);
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
        <PaymentTypesCard
          runtimeSettings={runtimeSettings}
          setRuntimeSettings={setRuntimeSettings}
          loading={loadingSettings}
          saving={savingSettings}
          onSave={handleSaveRuntimeSettings}
        />
        <DemoConfigCard
          runtimeSettings={runtimeSettings}
          setRuntimeSettings={setRuntimeSettings}
          loading={loadingSettings}
          saving={savingSettings}
          initializing={initializingDemo}
          onSave={handleSaveRuntimeSettings}
          onInitialize={handleInitializeDemo}
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

function PaymentTypesCard({
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
  const [newType, setNewType] = useState("");
  const paymentTypes = useMemo(
    () => parsePaymentTypes(runtimeSettings),
    [runtimeSettings],
  );

  function addPaymentType() {
    const trimmed = newType.trim();
    if (!trimmed) return;
    if (paymentTypes.includes(trimmed)) {
      toast.error("缴费类型已存在");
      return;
    }
    const updated = [...paymentTypes, trimmed];
    setRuntimeSettings((current) => ({
      ...current,
      paymentTypes: JSON.stringify(updated),
    }));
    setNewType("");
  }

  function removePaymentType(index: number) {
    const updated = paymentTypes.filter((_, i) => i !== index);
    setRuntimeSettings((current) => ({
      ...current,
      paymentTypes: JSON.stringify(updated),
    }));
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>缴费类型</CardTitle>
        <CardDescription>
          配置缴费管理中可选的缴费类型，例如晚餐+晚辅、打印费
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {paymentTypes.map((paymentType, index) => (
            <Badge
              key={`${paymentType}-${index}`}
              variant="secondary"
              className="gap-1 px-3 py-1.5 text-sm"
            >
              {paymentType}
              <button
                type="button"
                className="ml-1 rounded-full hover:bg-muted"
                onClick={() => removePaymentType(index)}
                disabled={loading || saving}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="输入新缴费类型"
            value={newType}
            disabled={loading || saving}
            onChange={(event) => setNewType(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addPaymentType();
              }
            }}
          />
          <Button
            variant="outline"
            size="icon"
            disabled={loading || saving || !newType.trim()}
            onClick={addPaymentType}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex justify-end">
          <Button disabled={loading || saving} onClick={onSave}>
            {saving ? "保存中..." : "保存缴费类型"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DemoConfigCard({
  runtimeSettings,
  setRuntimeSettings,
  loading,
  saving,
  initializing,
  onSave,
  onInitialize,
}: {
  runtimeSettings: RuntimeSettings;
  setRuntimeSettings: React.Dispatch<React.SetStateAction<RuntimeSettings>>;
  loading: boolean;
  saving: boolean;
  initializing: boolean;
  onSave: () => void;
  onInitialize: () => void;
}) {
  const disabled = loading || saving || initializing;

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Demo 环境</CardTitle>
        <CardDescription>
          配置 demo 教师与家长账号，并手动初始化独立的 demo 数据库。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Demo 教师</h3>
              <p className="text-xs text-muted-foreground">
                该账号同时拥有管理员与教师权限。
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="demo-teacher-name">名称</Label>
              <Input
                id="demo-teacher-name"
                disabled={disabled}
                value={runtimeSettings.demoTeacherName}
                onChange={(event) =>
                  setRuntimeSettings((current) => ({
                    ...current,
                    demoTeacherName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="demo-teacher-phone">手机号</Label>
              <Input
                id="demo-teacher-phone"
                disabled={disabled}
                value={runtimeSettings.demoTeacherPhone}
                onChange={(event) =>
                  setRuntimeSettings((current) => ({
                    ...current,
                    demoTeacherPhone: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="demo-teacher-password">密码</Label>
              <Input
                id="demo-teacher-password"
                disabled={disabled}
                value={runtimeSettings.demoTeacherPassword}
                onChange={(event) =>
                  setRuntimeSettings((current) => ({
                    ...current,
                    demoTeacherPassword: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Demo 家长</h3>
              <p className="text-xs text-muted-foreground">
                该账号会看到 demo 学生、用餐记录与每日作业。
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="demo-guardian-name">名称</Label>
              <Input
                id="demo-guardian-name"
                disabled={disabled}
                value={runtimeSettings.demoGuardianName}
                onChange={(event) =>
                  setRuntimeSettings((current) => ({
                    ...current,
                    demoGuardianName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="demo-guardian-phone">手机号</Label>
              <Input
                id="demo-guardian-phone"
                disabled={disabled}
                value={runtimeSettings.demoGuardianPhone}
                onChange={(event) =>
                  setRuntimeSettings((current) => ({
                    ...current,
                    demoGuardianPhone: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="demo-guardian-password">密码</Label>
              <Input
                id="demo-guardian-password"
                disabled={disabled}
                value={runtimeSettings.demoGuardianPassword}
                onChange={(event) =>
                  setRuntimeSettings((current) => ({
                    ...current,
                    demoGuardianPassword: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          初始化会重建 demo 数据库，并生成一套新的学校、班级、学生、用餐记录、每日作业、作业记录和缴费数据。
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Button disabled={disabled} variant="outline" onClick={onSave}>
            {saving ? "保存中..." : "保存 demo 配置"}
          </Button>
          <Button disabled={disabled} onClick={onInitialize}>
            {initializing ? "初始化中..." : "初始化 demo 数据"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
