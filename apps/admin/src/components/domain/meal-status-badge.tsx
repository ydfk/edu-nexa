import { CheckCircle2, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const mealStatusStyleMap = {
  absent: {
    className:
      "border-transparent bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
    icon: UtensilsCrossed,
    label: "未用餐",
  },
  completed: {
    className:
      "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    icon: CheckCircle2,
    label: "已用餐",
  },
  pending: {
    className:
      "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
    icon: UtensilsCrossed,
    label: "待处理",
  },
} as const;

export function MealStatusBadge({
  status,
}: {
  status: keyof typeof mealStatusStyleMap;
}) {
  const item = mealStatusStyleMap[status] ?? mealStatusStyleMap.pending;
  const Icon = item.icon;

  return (
    <Badge className={cn("gap-1", item.className)}>
      <Icon className="size-3.5" />
      {item.label}
    </Badge>
  );
}
