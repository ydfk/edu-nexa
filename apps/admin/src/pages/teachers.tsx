import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ListPagination } from "@/components/domain/list-pagination";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { paginateItems } from "@/lib/list-page";
import {
  createUser,
  fetchUsers,
  resetUserPassword,
  type UserItem,
} from "@/lib/server-data";

const pageSize = 10;
const initialForm = {
  displayName: "",
  password: "123456",
  phone: "",
};

export default function TeachersPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState<UserItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("123456");
  const [resetting, setResetting] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<UserItem | null>(null);

  useEffect(() => {
    void loadTeachers();
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
      return [item.displayName, item.phone, item.roles.join(" / ")]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedKeyword));
    });
  }, [items, keyword]);

  const pagination = useMemo(
    () => paginateItems(filteredItems, page, pageSize),
    [filteredItems, page]
  );

  async function loadTeachers() {
    setLoading(true);
    try {
      const users = await fetchUsers({ role: "teacher" });
      setItems(users);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeacher() {
    if (!form.phone || !form.password) {
      toast.error("手机号和默认密码不能为空");
      return;
    }

    setCreating(true);
    try {
      await createUser({
        displayName: form.displayName,
        password: form.password,
        phone: form.phone,
        roles: ["teacher"],
      });
      toast.success("教师账号已创建");
      setCreateDialogOpen(false);
      setForm(initialForm);
      await loadTeachers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleResetPassword() {
    if (!selectedTeacher || !resetPasswordValue) {
      toast.error("默认密码不能为空");
      return;
    }

    setResetting(true);
    try {
      await resetUserPassword(selectedTeacher.id, resetPasswordValue);
      toast.success("密码已重置");
      setResetDialogOpen(false);
      setResetPasswordValue("123456");
      setSelectedTeacher(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重置失败");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">教师账号</h1>
          <p className="text-sm text-muted-foreground">共 {filteredItems.length} 条</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>新增教师</Button>
      </div>

      <Card>
        <CardHeader>
          <Input
            placeholder="搜索姓名 / 手机号"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              加载中
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>手机号</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.displayName || "-"}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {item.roles.map((role) => (
                            <Badge key={role} variant="outline">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedTeacher(item);
                            setResetPasswordValue("123456");
                            setResetDialogOpen(true);
                          }}
                        >
                          重置密码
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination.totalRows === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                  暂无数据
                </div>
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
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增教师</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="teacher-name">姓名</Label>
              <Input
                id="teacher-name"
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, displayName: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="teacher-phone">手机号</Label>
              <Input
                id="teacher-phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="teacher-password">默认密码</Label>
              <Input
                id="teacher-password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={creating} onClick={handleCreateTeacher}>
              {creating ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="reset-phone">手机号</Label>
              <Input id="reset-phone" value={selectedTeacher?.phone || ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reset-password">新密码</Label>
              <Input
                id="reset-password"
                value={resetPasswordValue}
                onChange={(event) => setResetPasswordValue(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={resetting} onClick={handleResetPassword}>
              {resetting ? "保存中..." : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
