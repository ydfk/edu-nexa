import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ListPagination } from "@/components/domain/list-pagination";
import { StatusBadge } from "@/components/domain/status-badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageContent } from "@/components/page-content";
import { paginateItems } from "@/lib/list-page";
import {
  fetchGuardianProfiles,
  saveGuardianProfile,
  type GuardianProfileItem,
} from "@/lib/server-data";

const pageSize = 10;
const initialForm = {
  id: "",
  name: "",
  phone: "",
  relationship: "",
  remark: "",
  status: "active",
};

export default function GuardiansPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState<GuardianProfileItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }

      return [item.name, item.phone, item.relationship]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedKeyword));
    });
  }, [items, keyword, statusFilter]);

  const pagination = useMemo(
    () => paginateItems(filteredItems, page, pageSize),
    [filteredItems, page]
  );

  async function loadData() {
    setLoading(true);
    try {
      setItems(await fetchGuardianProfiles());
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

  function openEditDialog(item: GuardianProfileItem) {
    setForm({
      id: item.id,
      name: item.name,
      phone: item.phone,
      relationship: item.relationship,
      remark: item.remark,
      status: item.status,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("监护人姓名和手机号不能为空");
      return;
    }

    setSaving(true);
    try {
      await saveGuardianProfile({
        id: form.id || undefined,
        name: form.name.trim(),
        phone: form.phone.trim(),
        relationship: form.relationship.trim(),
        remark: form.remark.trim(),
        status: form.status,
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
    <PageContent>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg">监护人</CardTitle>
        <Button onClick={openCreateDialog}>新增监护人</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <Input
            placeholder="搜索姓名 / 手机号 / 关系"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">启用</SelectItem>
              <SelectItem value="paused">暂停</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">加载中</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>监护人</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead>关系</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.phone}</TableCell>
                    <TableCell>{item.relationship || "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "编辑监护人" : "新增监护人"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="guardian-name">姓名</Label>
              <Input
                id="guardian-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guardian-phone">手机号</Label>
              <Input
                id="guardian-phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guardian-relationship">关系</Label>
              <Input
                id="guardian-relationship"
                value={form.relationship}
                onChange={(event) =>
                  setForm((current) => ({ ...current, relationship: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>状态</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="paused">暂停</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guardian-remark">备注</Label>
              <Textarea
                id="guardian-remark"
                value={form.remark}
                onChange={(event) =>
                  setForm((current) => ({ ...current, remark: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </PageContent>
  );
}
