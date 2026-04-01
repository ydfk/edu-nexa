import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageContent } from "@/components/page-content";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  fetchServiceDays,
  saveServiceDay,
  type ServiceDayItem,
} from "@/lib/server-data";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** getDay() 返回 0=周日, 1=周一 … 6=周六，与此顺序一致 */
const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"] as const;
const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 0] as const; // 对应 getDay()

const SERVICE_COLORS: {
  key: keyof typeof INITIAL_BATCH_SERVICES;
  label: string;
  dot: string;
}[] = [
  { key: "hasLunchService", label: "午餐", dot: "bg-amber-400" },
  { key: "hasDinnerService", label: "晚餐", dot: "bg-orange-500" },
  { key: "hasDaytimeHomeworkService", label: "白天辅导", dot: "bg-blue-400" },
  { key: "hasEveningHomeworkService", label: "晚间辅导", dot: "bg-violet-500" },
];

const INITIAL_BATCH_SERVICES = {
  hasLunchService: false,
  hasDinnerService: true,
  hasDaytimeHomeworkService: false,
  hasEveningHomeworkService: true,
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ServiceCalendarPage() {
  // Data
  const [serviceDays, setServiceDays] = useState<ServiceDayItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  );

  // Batch form
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([
    1, 2, 3, 4, 5,
  ]);
  const [batchServices, setBatchServices] = useState(INITIAL_BATCH_SERVICES);
  const [batchWorkHours, setBatchWorkHours] = useState("");
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Single day edit
  const [editingDay, setEditingDay] = useState<{
    date: string;
    item: ServiceDayItem | null;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const serviceDayMap = useMemo(() => {
    const map = new Map<string, ServiceDayItem>();
    for (const item of serviceDays) map.set(item.serviceDate, item);
    return map;
  }, [serviceDays]);

  const matchedDates = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    const start = parse(dateRange.start, "yyyy-MM-dd", new Date());
    const end = parse(dateRange.end, "yyyy-MM-dd", new Date());
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return [];
    if (start > end) return [];
    return eachDayOfInterval({ start, end }).filter((d) =>
      selectedWeekdays.includes(getDay(d)),
    );
  }, [dateRange, selectedWeekdays]);

  // 日历网格中需要高亮的日期集合
  const matchedDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const d of matchedDates) set.add(format(d, "yyyy-MM-dd"));
    return set;
  }, [matchedDates]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setServiceDays(await fetchServiceDays());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setServiceDays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Weekday helpers
  // ---------------------------------------------------------------------------

  function toggleWeekday(day: number) {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function setPresetWeekdays(preset: "workdays" | "weekend" | "everyday") {
    if (preset === "workdays") setSelectedWeekdays([1, 2, 3, 4, 5]);
    else if (preset === "weekend") setSelectedWeekdays([6, 0]);
    else setSelectedWeekdays([0, 1, 2, 3, 4, 5, 6]);
  }

  // ---------------------------------------------------------------------------
  // Batch apply / clear
  // ---------------------------------------------------------------------------

  async function batchApply(clear = false) {
    if (matchedDates.length === 0) {
      toast.error("没有匹配的日期，请检查日期范围和星期选择");
      return;
    }

    const action = clear ? "清除" : "设置";
    const confirmed = window.confirm(
      `确定要批量${action} ${matchedDates.length} 个日期的服务项？`,
    );
    if (!confirmed) return;

    setBatchProgress({ current: 0, total: matchedDates.length });

    try {
      for (let i = 0; i < matchedDates.length; i++) {
        const date = matchedDates[i];
        const dateStr = format(date, "yyyy-MM-dd");
        const existing = serviceDayMap.get(dateStr);

        const services = clear
          ? {
              hasLunchService: false,
              hasDinnerService: false,
              hasDaytimeHomeworkService: false,
              hasEveningHomeworkService: false,
            }
          : batchServices;

        await saveServiceDay({
          hasDaytimeHomeworkService: services.hasDaytimeHomeworkService,
          hasDinnerService: services.hasDinnerService,
          hasEveningHomeworkService: services.hasEveningHomeworkService,
          hasHomeworkService:
            services.hasDaytimeHomeworkService ||
            services.hasEveningHomeworkService,
          hasLunchService: services.hasLunchService,
          hasMealService:
            services.hasLunchService || services.hasDinnerService,
          id: existing?.id ?? undefined,
          remark: existing?.remark ?? "",
          serviceDate: dateStr,
          workHours: clear ? (existing?.workHours ?? "") : batchWorkHours,
        });

        setBatchProgress({ current: i + 1, total: matchedDates.length });
      }

      toast.success(
        `已${action} ${matchedDates.length} 个日期`,
      );
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `批量${action}失败`);
    } finally {
      setBatchProgress(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Single day save
  // ---------------------------------------------------------------------------

  async function handleSaveDay(form: {
    hasDaytimeHomeworkService: boolean;
    hasDinnerService: boolean;
    hasEveningHomeworkService: boolean;
    hasLunchService: boolean;
    id?: string;
    remark: string;
    serviceDate: string;
    workHours: string;
  }) {
    await saveServiceDay({
      hasDaytimeHomeworkService: form.hasDaytimeHomeworkService,
      hasDinnerService: form.hasDinnerService,
      hasEveningHomeworkService: form.hasEveningHomeworkService,
      hasHomeworkService:
        form.hasDaytimeHomeworkService || form.hasEveningHomeworkService,
      hasLunchService: form.hasLunchService,
      hasMealService: form.hasLunchService || form.hasDinnerService,
      id: form.id ?? undefined,
      remark: form.remark,
      serviceDate: form.serviceDate,
      workHours: form.workHours,
    });
    toast.success("已保存");
    setEditingDay(null);
    await loadData();
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isBusy = batchProgress !== null;

  return (
    <PageContent>
      {/* Title */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">服务日历</h2>
          <p className="text-muted-foreground">管理服务日期与服务项目</p>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          加载中…
        </div>
      ) : (
        <div className="space-y-6">
          {/* ----------------------------------------------------------------- */}
          {/* Batch Setup Card                                                  */}
          {/* ----------------------------------------------------------------- */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">批量设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date range */}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="w-44"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((r) => ({ ...r, start: e.target.value }))
                  }
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  className="w-44"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((r) => ({ ...r, end: e.target.value }))
                  }
                />
              </div>

              {/* Weekday selectors */}
              <div className="flex flex-wrap items-center gap-2">
                <Label className="mr-1">星期</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPresetWeekdays("workdays")}
                >
                  工作日
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPresetWeekdays("weekend")}
                >
                  周末
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPresetWeekdays("everyday")}
                >
                  每天
                </Button>
                <span className="mx-1" />
                {WEEKDAY_VALUES.map((val, idx) => (
                  <Toggle
                    key={val}
                    size="sm"
                    pressed={selectedWeekdays.includes(val)}
                    onPressedChange={() => toggleWeekday(val)}
                  >
                    {WEEKDAY_LABELS[idx]}
                  </Toggle>
                ))}
              </div>

              {/* Service switches */}
              <div className="flex flex-wrap items-center gap-4">
                {SERVICE_COLORS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      checked={batchServices[key]}
                      onCheckedChange={(v) =>
                        setBatchServices((s) => ({ ...s, [key]: v }))
                      }
                    />
                    <Label>{label}</Label>
                  </div>
                ))}
              </div>

              {/* Work hours + preview + action */}
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  className="w-44"
                  placeholder="16:00-21:00"
                  value={batchWorkHours}
                  onChange={(e) => setBatchWorkHours(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">
                  将影响 <strong>{matchedDates.length}</strong> 个日期
                </span>
                <Button disabled={isBusy} onClick={() => batchApply(false)}>
                  {isBusy ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  应用设置
                </Button>
                <Button
                  disabled={isBusy}
                  variant="outline"
                  className="text-destructive border-destructive/40"
                  onClick={() => batchApply(true)}
                >
                  清除范围
                </Button>
              </div>

              {/* Progress */}
              {batchProgress && (
                <div className="space-y-1">
                  <Progress
                    value={
                      (batchProgress.current / batchProgress.total) * 100
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    正在设置 {batchProgress.current}/{batchProgress.total}…
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ----------------------------------------------------------------- */}
          {/* Calendar Grid                                                     */}
          {/* ----------------------------------------------------------------- */}
          <div>
            {/* Month navigation */}
            <div className="mb-3 flex items-center justify-center gap-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h3 className="text-lg font-semibold">
                {format(currentMonth, "yyyy年M月")}
              </h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 text-center text-sm font-medium text-muted-foreground">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1">
                  {label}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <TooltipProvider delayDuration={200}>
              <div className="grid grid-cols-7 gap-px rounded-lg border bg-border">
                {calendarDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const highlighted = matchedDateSet.has(dateStr);
                  const item = serviceDayMap.get(dateStr);

                  return (
                    <Tooltip key={dateStr}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "flex min-h-[80px] flex-col items-start gap-1 bg-background p-2 text-left transition-colors hover:bg-muted/60",
                            !inMonth && "text-muted-foreground opacity-40",
                            today && "ring-2 ring-primary ring-inset",
                            highlighted &&
                              "bg-primary/5 border border-primary/30",
                          )}
                          onClick={() =>
                            setEditingDay({ date: dateStr, item: item ?? null })
                          }
                        >
                          <span className="text-sm font-medium">
                            {format(day, "d")}
                          </span>
                          {item && (
                            <div className="flex flex-wrap gap-1">
                              {SERVICE_COLORS.map(({ key, dot }) =>
                                item[key] ? (
                                  <span
                                    key={key}
                                    className={cn(
                                      "inline-block h-2 w-2 rounded-full",
                                      dot,
                                    )}
                                  />
                                ) : null,
                              )}
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      {item && (
                        <TooltipContent side="top" className="text-xs">
                          <p>{dateStr}</p>
                          {SERVICE_COLORS.filter(({ key }) => item[key]).map(
                            ({ label }) => (
                              <span key={label} className="mr-1">
                                {label}
                              </span>
                            ),
                          )}
                          {item.workHours && <p>⏰ {item.workHours}</p>}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* Legend                                                             */}
          {/* ----------------------------------------------------------------- */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {SERVICE_COLORS.map(({ label, dot }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className={cn("inline-block h-2.5 w-2.5 rounded-full", dot)}
                />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Single Day Edit Dialog                                               */}
      {/* ------------------------------------------------------------------- */}
      {editingDay && (
        <SingleDayDialog
          dateStr={editingDay.date}
          item={editingDay.item}
          onClose={() => setEditingDay(null)}
          onSave={handleSaveDay}
        />
      )}
    </PageContent>
  );
}

// ---------------------------------------------------------------------------
// Single Day Dialog
// ---------------------------------------------------------------------------

function SingleDayDialog({
  dateStr,
  item,
  onClose,
  onSave,
}: {
  dateStr: string;
  item: ServiceDayItem | null;
  onClose: () => void;
  onSave: (form: {
    hasDaytimeHomeworkService: boolean;
    hasDinnerService: boolean;
    hasEveningHomeworkService: boolean;
    hasLunchService: boolean;
    id?: string;
    remark: string;
    serviceDate: string;
    workHours: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    hasLunchService: item?.hasLunchService ?? false,
    hasDinnerService: item?.hasDinnerService ?? false,
    hasDaytimeHomeworkService: item?.hasDaytimeHomeworkService ?? false,
    hasEveningHomeworkService: item?.hasEveningHomeworkService ?? false,
    workHours: item?.workHours ?? "",
    remark: item?.remark ?? "",
  });
  const [saving, setSaving] = useState(false);

  const displayDate = (() => {
    const d = parse(dateStr, "yyyy-MM-dd", new Date());
    return Number.isNaN(d.getTime()) ? dateStr : format(d, "yyyy年M月d日");
  })();

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        hasDaytimeHomeworkService: form.hasDaytimeHomeworkService,
        hasDinnerService: form.hasDinnerService,
        hasEveningHomeworkService: form.hasEveningHomeworkService,
        hasLunchService: form.hasLunchService,
        id: item?.id,
        remark: form.remark.trim(),
        serviceDate: dateStr,
        workHours: form.workHours.trim(),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{displayDate} 服务设置</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <SwitchField
            checked={form.hasLunchService}
            label="午餐"
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, hasLunchService: v }))
            }
          />
          <SwitchField
            checked={form.hasDinnerService}
            label="晚餐"
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, hasDinnerService: v }))
            }
          />
          <SwitchField
            checked={form.hasDaytimeHomeworkService}
            label="白天辅导"
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, hasDaytimeHomeworkService: v }))
            }
          />
          <SwitchField
            checked={form.hasEveningHomeworkService}
            label="晚间辅导"
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, hasEveningHomeworkService: v }))
            }
          />
          <Field label="工作时间">
            <Input
              placeholder="16:00-21:00"
              value={form.workHours}
              onChange={(e) =>
                setForm((f) => ({ ...f, workHours: e.target.value }))
              }
            />
          </Field>
          <Field label="备注">
            <Textarea
              value={form.remark}
              onChange={(e) =>
                setForm((f) => ({ ...f, remark: e.target.value }))
              }
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Shared helper components
// ---------------------------------------------------------------------------

function Field({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function SwitchField({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border px-4 py-3">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
