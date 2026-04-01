import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ListPagination } from "@/components/domain/list-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { paginateItems } from "@/lib/list-page";
import { fetchServiceDays, saveServiceDay, type ServiceDayItem } from "@/lib/server-data";

const pageSize = 10;
const initialForm = {
  hasDaytimeHomeworkService: false,
  hasDinnerService: false,
  hasEveningHomeworkService: false,
  hasLunchService: false,
  id: "",
  remark: "",
  serviceDate: "",
  workHours: "",
};

export default function ServiceCalendarPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState<ServiceDayItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return items;
    }

    return items.filter((item) => {
      return [item.serviceDate, item.remark, item.workHours]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedKeyword));
    });
  }, [items, keyword]);

  const pagination = useMemo(
    () => paginateItems(filteredItems, page, pageSize),
    [filteredItems, page]
  );

  async function loadData() {
    setLoading(true);
    try {
      setItems(await fetchServiceDays());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setForm(initialForm);
    setDialogOpen(true);
  }

  function openEditDialog(item: ServiceDayItem) {
    setForm({
      hasDaytimeHomeworkService: item.hasDaytimeHomeworkService,
      hasDinnerService: item.hasDinnerService,
      hasEveningHomeworkService: item.hasEveningHomeworkService,
      hasLunchService: item.hasLunchService,
      id: item.id,
      remark: item.remark,
      serviceDate: item.serviceDate,
      workHours: item.workHours || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.serviceDate.trim()) {
      toast.error("日期不能为空");
      return;
    }

    setSaving(true);
    try {
      await saveServiceDay({
        hasDaytimeHomeworkService: form.hasDaytimeHomeworkService,
        hasDinnerService: form.hasDinnerService,
        hasEveningHomeworkService: form.hasEveningHomeworkService,
        hasHomeworkService:
          form.hasDaytimeHomeworkService || form.hasEveningHomeworkService,
        hasLunchService: form.hasLunchService,
        hasMealService: form.hasLunchService || form.hasDinnerService,
        id: form.id || undefined,
        remark: form.remark.trim(),
        serviceDate: form.serviceDate.trim(),
        workHours: form.workHours.trim(),
      });
      toast.success("已保存");
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg">服务日历</CardTitle>
        <Button onClick={openCreateDialog}>新增日期</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="搜索日期 / 备注 / 工作时长"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />

        {loading ? (
          <div className="text-sm text-muted-foreground">加载中</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>午餐</TableHead>
                  <TableHead>晚餐</TableHead>
                  <TableHead>白天作业辅导</TableHead>
                  <TableHead>晚间作业导辅</TableHead>
                  <TableHead>工作时长</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.serviceDate}</TableCell>
                    <TableCell>{item.hasLunchService ? "开" : "关"}</TableCell>
                    <TableCell>{item.hasDinnerService ? "开" : "关"}</TableCell>
                    <TableCell>{item.hasDaytimeHomeworkService ? "开" : "关"}</TableCell>
                    <TableCell>{item.hasEveningHomeworkService ? "开" : "关"}</TableCell>
                    <TableCell>{item.workHours || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" onClick={() => openEditDialog(item)}>
                        编辑
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {pagination.totalRows === 0 ? (
              <div className="text-sm text-muted-foreground">无</div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">共 {pagination.totalRows} 条</p>
              <ListPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "编辑服务日历" : "新增服务日历"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Field label="日期">
              <Input
                placeholder="2026-03-31"
                value={form.serviceDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, serviceDate: event.target.value }))
                }
              />
            </Field>
            <Field label="工作时长">
              <Input
                placeholder="09:00-20:30"
                value={form.workHours}
                onChange={(event) =>
                  setForm((current) => ({ ...current, workHours: event.target.value }))
                }
              />
            </Field>
            <SwitchField
              checked={form.hasLunchService}
              label="午餐"
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, hasLunchService: checked }))
              }
            />
            <SwitchField
              checked={form.hasDinnerService}
              label="晚餐"
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, hasDinnerService: checked }))
              }
            />
            <SwitchField
              checked={form.hasDaytimeHomeworkService}
              label="白天作业辅导"
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, hasDaytimeHomeworkService: checked }))
              }
            />
            <SwitchField
              checked={form.hasEveningHomeworkService}
              label="晚间作业导辅"
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, hasEveningHomeworkService: checked }))
              }
            />
            <Field className="md:col-span-2" label="备注">
              <Textarea
                value={form.remark}
                onChange={(event) =>
                  setForm((current) => ({ ...current, remark: event.target.value }))
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

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
