import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";
import { LongText } from "@/components/long-text";
import { SchoolClassCascader } from "@/components/domain/school-class-cascader";
import { PageContent } from "@/components/page-content";
import { Button } from "@/components/ui/button";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import useDialogState from "@/hooks/use-dialog-state";
import { useAdminSession } from "@/lib/auth/session";
import {
  deleteDailyHomework,
  fetchClasses,
  fetchDailyHomework,
  fetchSchools,
  saveDailyHomework,
  type ClassItem,
  type DailyHomeworkItem,
  type SchoolItem,
} from "@/lib/server-data";
import { findHomeworkClass, getHomeworkContentLines } from "./daily-homework-helpers";
import DailyHomeworkBoard from "./daily-homework-board";

// ---------------------------------------------------------------------------
// 常量与类型
// ---------------------------------------------------------------------------

type DailyHomeworkDialogType = "create" | "edit";

const initialForm = {
  classId: "",
  content: "",
  id: "",
  remark: "",
  schoolId: "",
  serviceDate: "",
  subject: "",
};

// ---------------------------------------------------------------------------
// 上下文与弹窗状态
// ---------------------------------------------------------------------------

type DailyHomeworkContextValue = {
  open: DailyHomeworkDialogType | null;
  setOpen: (value: DailyHomeworkDialogType | null) => void;
  currentItem: DailyHomeworkItem | null;
  setCurrentItem: (item: DailyHomeworkItem | null) => void;
  reloadData: () => void;
  schools: SchoolItem[];
  classes: ClassItem[];
};

const DailyHomeworkContext = createContext<DailyHomeworkContextValue | null>(null);

function useDailyHomework() {
  const ctx = useContext(DailyHomeworkContext);
  if (!ctx) throw new Error("useDailyHomework must be used within DailyHomeworkProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// 列定义
// ---------------------------------------------------------------------------

const columns: ColumnDef<DailyHomeworkItem>[] = [
  {
    accessorKey: "serviceDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="日期" />,
    cell: ({ row }) => <div>{row.getValue("serviceDate")}</div>,
  },
  {
    accessorKey: "schoolName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="学校" />,
    cell: ({ row }) => row.getValue("schoolName") || "-",
  },
  {
    accessorKey: "className",
    header: ({ column }) => <DataTableColumnHeader column={column} title="班级" />,
    cell: ({ row }) => row.getValue("className") || "-",
    enableSorting: false,
  },
  {
    accessorKey: "content",
    header: ({ column }) => <DataTableColumnHeader column={column} title="作业内容" />,
    cell: ({ row }) => (
      <LongText className="max-w-[300px]">
        {getHomeworkContentLines(row.original).join("\n") || "-"}
      </LongText>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "teacherName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="教师" />,
    cell: ({ row }) => row.getValue("teacherName") || "-",
    enableSorting: false,
  },
  {
    id: "actions",
    cell: function ActionsCell({ row }) {
      const { reloadData, setOpen, setCurrentItem } = useDailyHomework();
      return (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCurrentItem(row.original);
              setOpen("edit");
            }}
          >
            <Pencil className="mr-2 size-4" />
            编辑
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={async () => {
              if (!window.confirm("确定删除这条每日作业？")) return;
              try {
                await deleteDailyHomework(row.original.id);
                toast.success("每日作业已删除");
                reloadData();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "删除失败");
              }
            }}
          >
            <Trash2 className="mr-2 size-4" />
            删除
          </Button>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

// ---------------------------------------------------------------------------
// 每日作业表单弹窗
// ---------------------------------------------------------------------------

function DailyHomeworkFormDialog() {
  const { open, setOpen, currentItem, reloadData, schools, classes } = useDailyHomework();
  const session = useAdminSession();
  const isEdit = open === "edit";
  const isOpen = open === "create" || open === "edit";

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && currentItem) {
      const school =
        schools.find((entry) => entry.id === currentItem.schoolId) ||
        schools.find((entry) => entry.name === currentItem.schoolName);
      const classItem = findHomeworkClass(currentItem, schools, classes);
      setForm({
        classId: classItem?.id || "",
        content: getHomeworkContentLines(currentItem).join("\n"),
        id: currentItem.id,
        remark: currentItem.remark,
        schoolId: school?.id || "",
        serviceDate: currentItem.serviceDate,
        subject: currentItem.subject || "",
      });
    } else if (open === "create") {
      setForm(initialForm);
    }
  }, [open, currentItem, isEdit, schools, classes]);

  async function handleSave() {
    const school = schools.find((item) => item.id === form.schoolId);
    const classItem = classes.find((item) => item.id === form.classId);
    if (!school || !classItem || !form.serviceDate.trim() || !form.subject.trim()) {
      toast.error("学校、年级、班级、日期、科目不能为空");
      return;
    }

    const contentLines = form.content
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      await saveDailyHomework({
        classId: classItem.id,
        className: classItem.name,
        content: contentLines.join("\n"),
        gradeName: classItem.gradeName,
        id: form.id || undefined,
        items: contentLines.map((item) => ({ content: item })),
        remark: form.remark.trim(),
        schoolId: school.id,
        schoolName: school.name,
        serviceDate: form.serviceDate.trim(),
        subject: form.subject.trim(),
        teacherId: session.user?.id || "",
        teacherName: session.user?.displayName || "",
      });
      toast.success("已保存");
      setOpen(null);
      reloadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑每日作业" : "新增每日作业"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <Label required>学校 / 年级 / 班级</Label>
            <SchoolClassCascader
              schools={schools}
              classes={classes}
              schoolId={form.schoolId}
              classId={form.classId}
              onSelect={(sid, cid) =>
                setForm((current) => ({ ...current, schoolId: sid, classId: cid }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hw-service-date" required>日期</Label>
            <Input
              id="hw-service-date"
              placeholder="2026-03-31"
              value={form.serviceDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, serviceDate: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hw-subject" required>科目</Label>
            <Input
              id="hw-subject"
              placeholder="例如：语文"
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({ ...current, subject: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="hw-content">作业内容</Label>
            <Textarea
              id="hw-content"
              value={form.content}
              onChange={(event) =>
                setForm((current) => ({ ...current, content: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="hw-remark">备注</Label>
            <Textarea
              id="hw-remark"
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
  );
}

// ---------------------------------------------------------------------------
// 页面组件
// ---------------------------------------------------------------------------

export default function DailyHomeworkPage() {
  return (
    <PageContent>
      <div className="mb-2">
        <h2 className="text-2xl font-bold tracking-tight">每日作业</h2>
        <p className="text-muted-foreground">管理每日作业记录</p>
      </div>

      <Tabs defaultValue="board" className="flex-1">
        <TabsList>
          <TabsTrigger value="board">面板视图</TabsTrigger>
          <TabsTrigger value="list">列表视图</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="mt-4">
          <DailyHomeworkBoard />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <DailyHomeworkListView />
        </TabsContent>
      </Tabs>
    </PageContent>
  );
}

// ---------------------------------------------------------------------------
// 列表视图（原有逻辑）
// ---------------------------------------------------------------------------

function DailyHomeworkListView() {
  const [open, setOpen] = useDialogState<DailyHomeworkDialogType>();
  const [currentItem, setCurrentItem] = useState<DailyHomeworkItem | null>(null);

  const [items, setItems] = useState<DailyHomeworkItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [homeworkItems, schoolItems, classItems] = await Promise.all([
        fetchDailyHomework(),
        fetchSchools({ status: "active" }),
        fetchClasses({ status: "active" }),
      ]);
      setItems(homeworkItems);
      setSchools(schoolItems);
      setClasses(classItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setItems([]);
      setSchools([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const keyword = filterValue.toLowerCase();
      return [
        row.original.schoolName,
        row.original.className,
        row.original.content,
        row.original.teacherName,
        row.original.serviceDate,
      ]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(keyword));
    },
  });

  const contextValue = useMemo<DailyHomeworkContextValue>(
    () => ({ open, setOpen, currentItem, setCurrentItem, reloadData: loadData, schools, classes }),
    [open, setOpen, currentItem, schools, classes, loadData],
  );

  return (
    <DailyHomeworkContext.Provider value={contextValue}>
      <div>
        {/* 头部操作区 */}
        <div className="mb-4 flex flex-wrap items-center justify-end gap-x-4">
          <Button className="space-x-1" onClick={() => setOpen("create")}>
            <span>新增作业</span> <Plus size={18} />
          </Button>
        </div>

        {/* 数据表格 */}
        <div className="flex-1 overflow-auto py-1 lg:flex-row lg:space-x-12 lg:space-y-0">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              加载中…
            </div>
          ) : (
            <div className="space-y-4">
              <DataTableToolbar
                table={table}
                searchPlaceholder="搜索学校 / 班级 / 内容 / 教师…"
              />

              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} colSpan={header.colSpan}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className="group/row">
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className="bg-background group-hover/row:bg-muted"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination table={table} />
            </div>
          )}
        </div>

        {/* 弹窗 */}
        <DailyHomeworkFormDialog />
      </div>
    </DailyHomeworkContext.Provider>
  );
}
