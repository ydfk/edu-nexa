import { useEffect, useState } from "react";
import { Database, KeyRound, ShieldCheck, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  fetchRuntimeSettings,
  getDefaultRuntimeSettings,
  saveRuntimeSettings,
  type RuntimeSettings,
} from "@/lib/runtime-settings";

const settingGroups = [
  {
    title: "账号与角色",
    icon: ShieldCheck,
    items: [
      "管理员、教师、监护人、学生共用手机号账号体系",
      "同一手机号可绑定多个角色",
      "管理端使用手机号 + 密码登录",
      "小程序使用微信登录态 + 手机号授权登录",
      "教师负责记录，监护人负责查看",
      "管理员负责配置与校区运营管理",
    ],
  },
  {
    title: "业务字典",
    icon: Workflow,
    items: [
      "用餐状态枚举",
      "作业状态枚举",
      "缴费状态枚举",
      "学校 / 班级字段规范",
      "家长查看文案模板",
      "校区服务时段与服务日历",
    ],
  },
  {
    title: "接口配置",
    icon: Database,
    items: ["后台 API 地址", "小程序上传地址", "对象存储桶", "日志保留周期"],
  },
  {
    title: "安全配置",
    icon: KeyRound,
    items: ["JWT 密钥", "管理端密码策略", "微信手机号授权校验", "操作审计"],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<RuntimeSettings>(getDefaultRuntimeSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchRuntimeSettings()
      .then((payload) => {
        if (!cancelled) {
          setSettings(payload);
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
      const payload = await saveRuntimeSettings(settings);
      setSettings(payload);
      toast.success("运行配置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function updateSetting<K extends keyof RuntimeSettings>(field: K, value: RuntimeSettings[K]) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <div className="space-y-4">
      <Card className="border-none bg-card/90 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">运行配置</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="upload-provider">默认上传存储</Label>
            <Select
              disabled={loading}
              value={settings.uploadProvider}
              onValueChange={(value) =>
                updateSetting("uploadProvider", value as RuntimeSettings["uploadProvider"])
              }
            >
              <SelectTrigger id="upload-provider">
                <SelectValue placeholder="选择默认上传存储" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">本地上传</SelectItem>
                <SelectItem value="aliyun_oss">阿里云 OSS</SelectItem>
                <SelectItem value="upyun">又拍云</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              这里切的是默认提供方，密钥与 Bucket 仍从服务端配置文件读取。
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">文本内容安全</p>
                <p className="text-sm text-muted-foreground">
                  用餐备注、作业反馈、每日作业、首页文案保存前校验。
                </p>
              </div>
              <Switch
                checked={settings.textSecurityEnable}
                disabled={loading}
                onCheckedChange={(value) => updateSetting("textSecurityEnable", value)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">文本审核严格模式</p>
                <p className="text-sm text-muted-foreground">
                  审核失败时直接拦截保存，关闭后只记录告警日志。
                </p>
              </div>
              <Switch
                checked={settings.textSecurityStrict}
                disabled={loading || !settings.textSecurityEnable}
                onCheckedChange={(value) => updateSetting("textSecurityStrict", value)}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">图片内容安全</p>
                <p className="text-sm text-muted-foreground">
                  教师上传用餐、作业图片后触发微信图片审核。
                </p>
              </div>
              <Switch
                checked={settings.imageSecurityEnable}
                disabled={loading}
                onCheckedChange={(value) => updateSetting("imageSecurityEnable", value)}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">图片审核严格模式</p>
                <p className="text-sm text-muted-foreground">
                  审核失败时直接拦截上传，关闭后只记录告警日志。
                </p>
              </div>
              <Switch
                checked={settings.imageSecurityStrict}
                disabled={loading || !settings.imageSecurityEnable}
                onCheckedChange={(value) => updateSetting("imageSecurityStrict", value)}
              />
            </div>
          </div>

          <div className="flex items-end">
            <Button disabled={loading || saving} onClick={handleSave}>
              {saving ? "保存中..." : "保存运行配置"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {settingGroups.map((group) => (
          <Card key={group.title} className="border-none bg-card/90 shadow-md">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <group.icon className="size-5" />
              </div>
              <CardTitle className="text-lg">{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.items.map((item) => (
                <div key={item} className="rounded-2xl border px-4 py-3 text-sm">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
