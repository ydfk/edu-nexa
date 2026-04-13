import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CircleCheck, CircleDashed, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";
import {
  AttachmentPreviewList,
} from "@/components/domain/attachment-preview";
import {
  FileUpload,
  createFileItemsFromUrls,
  serializeAttachments,
  type FileItem,
} from "@/components/domain/file-upload";
import { HomeworkStatusBadge } from "@/components/domain/homework-status-badge";
import { LongText } from "@/components/long-text";
import { PageContent } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import useDialogState from "@/hooks/use-dialog-state";
import { useAutoSelectSingleID } from "@/hooks/use-auto-select-single-id";
import { useAdminSession } from "@/lib/auth/session";
import {
  deleteHomeworkRecord,
  fetchDailyHomework,
  fetchHomeworkRecords,
  fetchStudents,
  saveHomeworkRecord,
  type DailyHomeworkItem,
  type HomeworkRecordItem,
  type StudentItem,
} from "@/lib/server-data";
import { getHomeworkContentLines } from "./daily-homework-helpers";
import HomeworkRecordBoard from "./homework-record-board";
import {
  getAssignmentsForStudent,
  homeworkStatusMap,
} from "./homework-record-helpers";

type HomeworkRecordDialogType = "create" | "edit";

const statusFilterOptions = [
  { label: "未完成", value: "pending", icon: Clock },
  { label: "已完成", value: "completed", icon: CircleCheck },
  { label: "部分完成", value: "partial", icon: CircleDashed },
] as const;

const initialForm = {
  assignmentId: "",
  id: "",
  imageUrls: [] as FileItem[],
  remark: "",
  serviceDate: "",
  status: "pending",
  studentId: "",
  subject: "",
  subjectSummary: "",
};

function isActiveStudent(item: StudentItem) {
  return !item.status || item.status === "active";
}

type HomeworkRecordsContextValue = {
  open: HomeworkRecordDialogType | null;
  setOpen: (value: HomeworkRecordDialogType | null) => void;
  currentItem: HomeworkRecordItem | null;
  setCurrentItem: (item: HomeworkRecordItem | null) => void;
  canEdit: boolean;
  reloadData: () => void;
  students: StudentItem[];
};

const HomeworkRecordsContext = createContext<HomeworkRecordsContextValue | null>(null);

function useHomeworkRecords() {
  const ctx = useContext(HomeworkRecordsContext);
  if (!ctx) {
    throw new Error("useHomeworkRecords must be used within HomeworkRecordsProvider");
  }
  return ctx;
}

const columns: ColumnDef<HomeworkRecordItem>[] = [
  {
    accessorKey: "serviceDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="日期" />,
    cell: ({ row }) => <div>{row.getValue("serviceDate")}</div>,
  },
  {
    accessorKey: "studentName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="学生" />,
    cell: ({ row }) => <div className="font-medium">{row.getValue("studentName")}</div>,
  },
  {
    id: "schoolClass",
    header: ({ column }) => <DataTableColumnHeader column={column} title="学校 / 班级" />,
    cell: ({ row }) => {
      const text = [row.original.schoolName, row.original.className].filter(Boolean).join(" / ");
      return <div>{text || "-"}</div>;
    },
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="完成情况" />,
    cell: ({ row }) => {
      const status = row.getValue<string>("status");
      const info = homeworkStatusMap[status];
      if (!info) {
        return <Badge variant="outline">{status}</Badge>;
      }
      return <HomeworkStatusBadge status={status as "completed" | "partial" | "pending"} />;
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "subject",
    header: ({ column }) => <DataTableColumnHeader column={column} title="科目" />,
    cell: ({ row }) => row.getValue("subject") || "-",
    enableSorting: false,
  },
  {
    accessorKey: "subjectSummary",
    header: ({ column }) => <DataTableColumnHeader column={column} title="作业内容" />,
    cell: ({ row }) => (
      <LongText className="max-w-[220px]">{row.getValue("subjectSummary") || "-"}</LongText>
    ),
    enableSorting: false,
  },
  {
    id: "attachments",
    header: "附件",
    cell: ({ row }) => (
      <AttachmentPreviewList compact items={createFileItemsFromUrls(row.original.imageUrls)} />
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    cell: function ActionsCell({ row }) {
      const { reloadData, setOpen, setCurrentItem, canEdit } = useHomeworkRecords();
      if (!canEdit) {
        return null;
      }
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
              if (!window.confirm("确定删除这条作业记录？")) {
                return;
              }
              try {
                await deleteHomeworkRecord(row.original.id);
                toast.success("作业记录已删除");
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

function HomeworkRecordFormDialog() {
  const { open, setOpen, currentItem, reloadData, students } = useHomeworkRecords();
  const session = useAdminSession();
  const isEdit = open === "edit";
  const isOpen = open === "create" || open === "edit";

  const [form, setForm] = useState(initialForm);
  const [assignments, setAssignments] = useState<DailyHomeworkItem[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectableStudents = useMemo(() => {
    const activeItems = students.filter(isActiveStudent);
    if (!form.studentId || activeItems.some((item) => item.id === form.studentId)) {
      return activeItems;
    }

    const currentStudent = students.find((item) => item.id === form.studentId);
    return currentStudent ? [...activeItems, currentStudent] : activeItems;
  }, [form.studentId, students]);

  const selectedStudent = useMemo(
    () => students.find((item) => item.id === form.studentId),
    [form.studentId, students],
  );

  const selectableAssignments = useMemo(() => {
    const baseItems = getAssignmentsForStudent(selectedStudent, assignments);
    if (!isEdit || !currentItem || !form.subject || !form.assignmentId) {
      return baseItems;
    }
    if (baseItems.some((item) => item.id === form.assignmentId)) {
      return baseItems;
    }

    return [
      ...baseItems,
      {
        attachments: [],
        classId: selectedStudent?.classId || "",
        className: selectedStudent?.className || currentItem.className,
        content: currentItem.subjectSummary,
        gradeName: selectedStudent?.grade || "",
        id: form.assignmentId,
        items: currentItem.subjectSummary
          .split("\n")
          .map((content, index) => ({
            assignmentId: form.assignmentId,
            content,
            id: `${form.assignmentId}-${index}`,
            sort: index + 1,
          })),
        remark: "",
        schoolId: selectedStudent?.schoolId || "",
        schoolName: selectedStudent?.schoolName || currentItem.schoolName,
        serviceDate: form.serviceDate,
        subject: form.subject,
        teacherId: "",
        teacherName: "",
      },
    ];
  }, [assignments, currentItem, form.assignmentId, form.serviceDate, form.subject, isEdit, selectedStudent]);

  const selectedAssignment = useMemo(
    () => selectableAssignments.find((item) => item.id === form.assignmentId) || null,
    [form.assignmentId, selectableAssignments],
  );

  useAutoSelectSingleID(
    selectableStudents,
    form.studentId,
    (student) =>
      setForm((current) =>
        current.studentId === student.id
          ? current
          : {
              ...current,
              assignmentId: "",
              studentId: student.id,
              subject: "",
              subjectSummary: "",
            },
      ),
    isOpen,
  );

  useAutoSelectSingleID(
    selectableAssignments,
    form.assignmentId,
    (assignment) =>
      setForm((current) =>
        current.assignmentId === assignment.id
          ? current
          : { ...current, assignmentId: assignment.id },
      ),
    isOpen && !!form.studentId && !!form.serviceDate.trim() && !loadingAssignments,
  );

  useEffect(() => {
    if (isEdit && currentItem) {
      setForm({
        assignmentId: currentItem.assignmentId,
        id: currentItem.id,
        imageUrls: createFileItemsFromUrls(currentItem.imageUrls),
        remark: currentItem.remark,
        serviceDate: currentItem.serviceDate,
        status: currentItem.status,
        studentId: currentItem.studentId,
        subject: currentItem.subject,
        subjectSummary: currentItem.subjectSummary,
      });
      return;
    }

    if (open === "create") {
      setForm(initialForm);
    }
  }, [currentItem, isEdit, open]);

  useEffect(() => {
    if (!isOpen || !form.serviceDate.trim()) {
      setAssignments([]);
      return;
    }

    let cancelled = false;

    async function loadAssignments() {
      setLoadingAssignments(true);
      try {
        const items = await fetchDailyHomework({ serviceDate: form.serviceDate.trim() });
        if (!cancelled) {
          setAssignments(items);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "加载作业失败");
          setAssignments([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAssignments(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [form.serviceDate, isOpen]);

  useEffect(() => {
    if (!selectedAssignment) {
      return;
    }

    setForm((current) => ({
      ...current,
      subject: selectedAssignment.subject,
      subjectSummary: getHomeworkContentLines(selectedAssignment).join("\n"),
    }));
  }, [selectedAssignment]);

  async function handleSave() {
    if (!selectedStudent || !form.serviceDate.trim() || !selectedAssignment) {
      toast.error("学生、日期和作业不能为空");
      return;
    }

    setSaving(true);
    try {
      await saveHomeworkRecord({
        assignmentId: selectedAssignment.id,
        className: selectedStudent.className,
        id: form.id || undefined,
        imageUrls: serializeAttachments(form.imageUrls),
        recordedBy: session.user?.displayName || "",
        recordedById: session.user?.id || "",
        remark: form.remark.trim(),
        schoolName: selectedStudent.schoolName,
        serviceDate: form.serviceDate.trim(),
        status: form.status,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        subject: selectedAssignment.subject,
        subjectSummary: getHomeworkContentLines(selectedAssignment).join("\n"),
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑作业记录" : "新增作业记录"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label required>学生</Label>
            <Select
              value={form.studentId}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  assignmentId: "",
                  studentId: value,
                  subject: "",
                  subjectSummary: "",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择学生" />
              </SelectTrigger>
              <SelectContent>
                {selectableStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hw-date" required>日期</Label>
            <Input
              id="hw-date"
              placeholder="2026-03-31"
              value={form.serviceDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  assignmentId: "",
                  serviceDate: event.target.value,
                  subject: "",
                  subjectSummary: "",
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>完成情况</Label>
            <Select
              value={form.status}
              onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">未完成</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="partial">部分完成</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label required>作业</Label>
            <Select
              value={form.assignmentId}
              onValueChange={(value) => setForm((current) => ({ ...current, assignmentId: value }))}
              disabled={!form.studentId || !form.serviceDate.trim() || loadingAssignments}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !form.serviceDate.trim()
                      ? "先选择日期"
                      : loadingAssignments
                        ? "加载作业中..."
                        : "选择作业"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {selectableAssignments.map((assignment) => (
                  <SelectItem key={assignment.id} value={assignment.id}>
                    {assignment.subject || "未分类"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="hw-subject-summary">作业内容</Label>
            <Textarea
              id="hw-subject-summary"
              readOnly
              value={form.subjectSummary}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>附件（图片 / PDF）</Label>
            <FileUpload
              value={form.imageUrls}
              onChange={(value) => setForm((current) => ({ ...current, imageUrls: value }))}
              maxFiles={9}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="hw-remark">反馈</Label>
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

function HomeworkRecordListView() {
  const session = useAdminSession();
  const [open, setOpen] = useDialogState<HomeworkRecordDialogType>();
  const [currentItem, setCurrentItem] = useState<HomeworkRecordItem | null>(null);
  const [items, setItems] = useState<HomeworkRecordItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const canEdit = !!session.user?.roles.some((role) => role === "admin" || role === "teacher");

  useEffect(() => {
    void loadData();
  }, [session.user?.phone]);

  async function loadData() {
    setLoading(true);
    try {
      const studentItems = await fetchStudents(
        session.user?.roles.includes("guardian")
          ? { guardianPhone: session.user?.phone || "" }
          : undefined,
      );
      const recordItems = await fetchHomeworkRecords();
      const visibleStudentIDs = new Set(studentItems.map((item) => item.id));

      setStudents(studentItems);
      setItems(
        canEdit
          ? recordItems
          : recordItems.filter((item) => visibleStudentIDs.has(item.studentId)),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setStudents([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const keyword = filterValue.toLowerCase();
      return [
        row.original.studentName,
        row.original.schoolName,
        row.original.className,
        row.original.subject,
        row.original.subjectSummary,
        row.original.remark,
        row.original.serviceDate,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    },
  });

  const contextValue = useMemo<HomeworkRecordsContextValue>(
    () => ({
      open,
      setOpen,
      currentItem,
      setCurrentItem,
      canEdit,
      reloadData: loadData,
      students,
    }),
    [open, setOpen, currentItem, canEdit, students],
  );

  return (
    <HomeworkRecordsContext.Provider value={contextValue}>
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          {canEdit ? (
            <Button className="space-x-1" onClick={() => setOpen("create")}>
              <span>新增记录</span> <Plus size={18} />
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            加载中…
          </div>
        ) : (
          <div className="space-y-4">
            <DataTableToolbar
              table={table}
              searchPlaceholder="搜索学生 / 学校 / 班级 / 科目 / 反馈 / 日期…"
              filters={[
                {
                  columnId: "status",
                  title: "完成情况",
                  options: statusFilterOptions.map((option) => ({
                    label: option.label,
                    value: option.value,
                    icon: option.icon,
                  })),
                },
              ]}
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
                      <TableCell colSpan={columns.length} className="h-24 text-center">
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

        <HomeworkRecordFormDialog />
      </div>
    </HomeworkRecordsContext.Provider>
  );
}

export default function HomeworkRecordsPage() {
  return (
    <PageContent>
      <div className="mb-2">
        <h2 className="text-2xl font-bold tracking-tight">作业记录</h2>
        <p className="text-muted-foreground">管理学生作业完成情况</p>
      </div>

      <Tabs defaultValue="board" className="flex-1">
        <TabsList>
          <TabsTrigger value="board">面板视图</TabsTrigger>
          <TabsTrigger value="list">列表视图</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="mt-4">
          <HomeworkRecordBoard />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <HomeworkRecordListView />
        </TabsContent>
      </Tabs>
    </PageContent>
  );
}
