import {
  CheckCircle2,
  CircleDashed,
  CircleHelp,
  CircleX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const homeworkStatusStyleMap = {
  completed: {
    className:
      "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    icon: CheckCircle2,
    label: "已完成",
  },
  partial: {
    className:
      "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
    icon: CircleDashed,
    label: "部分完成",
  },
  pending: {
    className:
      "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
    icon: CircleX,
    label: "未完成",
  },
  unrecorded: {
    className:
      "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
    icon: CircleHelp,
    label: "未记录",
  },
} as const;

export function HomeworkStatusBadge({
  status,
}: {
  status: keyof typeof homeworkStatusStyleMap;
}) {
  const item = homeworkStatusStyleMap[status];
  const Icon = item.icon;

  return (
    <Badge className={cn("gap-1", item.className)}>
      <Icon className="size-3.5" />
      {item.label}
    </Badge>
  );
}
