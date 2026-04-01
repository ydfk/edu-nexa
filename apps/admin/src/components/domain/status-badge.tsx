import { Badge } from "@/components/ui/badge";

const statusMap: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  active: {
    label: "启用",
    className: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  completed: {
    label: "已完成",
    className: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  partial: {
    label: "完成一部分",
    className: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  },
  pending: {
    label: "待处理",
    className: "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
  },
  paid: {
    label: "已缴费",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  unpaid: {
    label: "待缴费",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  },
  paused: {
    label: "已暂停",
    className: "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
  },
  in_progress: {
    label: "处理中",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  },
  leave: {
    label: "请假",
    className: "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
  },
  pending_parent_followup: {
    label: "待家长跟进",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const item = statusMap[status] ?? {
    label: status,
    className: "border-transparent bg-muted text-muted-foreground",
  };

  return <Badge className={item.className}>{item.label}</Badge>;
}
