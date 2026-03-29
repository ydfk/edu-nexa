import { BellDot, MessageSquareText, Send } from "lucide-react";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { guardianTouchpoints } from "@/lib/mock-data";

export default function GuardiansPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Card className="border-none bg-card/90 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">家校通知触点</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {guardianTouchpoints.map((item) => (
            <div key={item.title} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.channel}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-3 text-sm">{item.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-none bg-card/90 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">后续建议</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border p-4">
            <BellDot className="size-5 text-primary" />
            <p className="mt-3 font-medium">补齐服务通知模板</p>
            <p className="mt-1 text-sm text-muted-foreground">
              将晚餐、作业、离校三类通知拆分成独立模板。
            </p>
          </div>
          <div className="rounded-2xl border p-4">
            <MessageSquareText className="size-5 text-primary" />
            <p className="mt-3 font-medium">沉淀教师常用反馈语</p>
            <p className="mt-1 text-sm text-muted-foreground">
              让老师在小程序端可以一键选用常见作业反馈。
            </p>
          </div>
          <div className="rounded-2xl border p-4">
            <Send className="size-5 text-primary" />
            <p className="mt-3 font-medium">支持定时汇总推送</p>
            <p className="mt-1 text-sm text-muted-foreground">
              每晚固定时段发送班级完成率与未闭环名单。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
