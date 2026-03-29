import { Database, KeyRound, ShieldCheck, Workflow } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      "家长查看文案模板",
      "校区服务时段",
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
  return (
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
  );
}
