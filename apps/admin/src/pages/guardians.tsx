import { BellDot, MessageSquareText, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const guidanceItems = [
  {
    description: "将晚餐、作业、离校三类通知拆分成独立模板。",
    icon: BellDot,
    title: "补齐服务通知模板",
  },
  {
    description: "让老师在小程序端可以一键选用常见作业反馈。",
    icon: MessageSquareText,
    title: "沉淀教师常用反馈语",
  },
  {
    description: "每晚固定时段发送班级完成率与未闭环名单。",
    icon: Send,
    title: "支持定时汇总推送",
  },
];

export default function GuardiansPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card className="border-none bg-card/90 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">家校同步能力</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-2xl border p-4">
            当前版本已经完成教师记录、监护人查看的基础数据链路，但家校通知模板、服务通知推送和异常回执仍未正式落库。
          </div>
          <div className="rounded-2xl border p-4">
            这里不再展示模拟触点数据，后续建议直接基于真实通知模板、发送日志和家长回执记录来做。
          </div>
        </CardContent>
      </Card>
      <Card className="border-none bg-card/90 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">后续建议</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {guidanceItems.map((item) => (
            <div key={item.title} className="rounded-2xl border p-4">
              <item.icon className="size-5 text-primary" />
              <p className="mt-3 font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
