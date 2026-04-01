import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AlertTriangle, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";
import { PageContent } from "@/components/page-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import useDialogState from "@/hooks/use-dialog-state";
import { findSimilarNames, hasExactName } from "@/lib/name-check";
import {
  fetchClasses,
  fetchGrades,
  fetchSchools,
  fetchStudents,
  saveClass,
  saveGrade,
  saveSchool,
  type ClassItem,
  type GradeItem,
  type SchoolItem,
  type StudentItem,
} from "@/lib/server-data";

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

type SchoolsDialogType =
  | "add-school"
  | "edit-school"
  | "add-grade"
  | "edit-grade"
  | "add-class"
  | "edit-class";

type SchoolsContextValue = {
  classes: ClassItem[];
  grades: GradeItem[];
  loading: boolean;
  open: SchoolsDialogType | null;
  schools: SchoolItem[];
  setOpen: (value: SchoolsDialogType | null) => void;
  studentCountByClassID: Record<string, number>;
  studentCountBySchoolID: Record<string, number>;
  currentSchool: SchoolItem | null;
  setCurrentSchool: (item: SchoolItem | null) => void;
  currentGrade: GradeItem | null;
  setCurrentGrade: (item: GradeItem | null) => void;
  currentClass: ClassItem | null;
  setCurrentClass: (item: ClassItem | null) => void;
  classPreset: Partial<{ schoolId: string; gradeId: string }>;
  setClassPreset: (preset: Partial<{ schoolId: string; gradeId: string }>) => void;
};

// ---------------------------------------------------------------------------
// 表单初始值
// ---------------------------------------------------------------------------

const initialSchoolForm = {
  id: "",
  name: "",
  status: "active",
};

const initialGradeForm = {
  id: "",
  name: "",
  sort: "0",
  status: "active",
};

const initialClassForm = {
  gradeId: "",
  id: "",
  name: "",
  schoolId: "",
  status: "active",
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SchoolsContext = createContext<SchoolsContextValue | null>(null);

function useSchoolsContext() {
  const ctx = useContext(SchoolsContext);
  if (!ctx) throw new Error("useSchoolsContext must be used within SchoolsProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// 主页面
// ---------------------------------------------------------------------------

export default function SchoolsPage() {
  const [open, setOpen] = useDialogState<SchoolsDialogType>();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);

  const [currentSchool, setCurrentSchool] = useState<SchoolItem | null>(null);
  const [currentGrade, setCurrentGrade] = useState<GradeItem | null>(null);
  const [currentClass, setCurrentClass] = useState<ClassItem | null>(null);
  const [classPreset, setClassPreset] = useState<Partial<{ schoolId: string; gradeId: string }>>({});

  useEffect(() => {
    void loadData();
  }, []);

  const studentCountByClassID = useMemo(() => {
    return students.reduce<Record<string, number>>((acc, item) => {
      if (!item.classId) return acc;
      acc[item.classId] = (acc[item.classId] || 0) + 1;
      return acc;
    }, {});
  }, [students]);

  const studentCountBySchoolID = useMemo(() => {
    return students.reduce<Record<string, number>>((acc, item) => {
      if (!item.schoolId) return acc;
      acc[item.schoolId] = (acc[item.schoolId] || 0) + 1;
      return acc;
    }, {});
  }, [students]);

  async function loadData() {
    setLoading(true);
    try {
      const [schoolItems, gradeItems, classItems, studentItems] = await Promise.all([
        fetchSchools(),
        fetchGrades(),
        fetchClasses(),
        fetchStudents(),
      ]);
      setSchools(schoolItems);
      setGrades(gradeItems);
      setClasses(classItems);
      setStudents(studentItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setSchools([]);
      setGrades([]);
      setClasses([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  const contextValue = useMemo<SchoolsContextValue>(
    () => ({
      classes,
      grades,
      loading,
      open,
      schools,
      setOpen,
      studentCountByClassID,
      studentCountBySchoolID,
      currentSchool,
      setCurrentSchool,
      currentGrade,
      setCurrentGrade,
      currentClass,
      setCurrentClass,
      classPreset,
      setClassPreset,
    }),
    [
      classes,
      grades,
      loading,
      open,
      schools,
      setOpen,
      studentCountByClassID,
      studentCountBySchoolID,
      currentSchool,
      currentGrade,
      currentClass,
      classPreset,
    ]
  );

  return (
    <SchoolsContext.Provider value={contextValue}>
      <PageContent>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">学校管理</h1>
            <p className="text-sm text-muted-foreground">
              管理学校、年级与班级信息
            </p>
          </div>

          <Tabs defaultValue="schools">
            <TabsList>
              <TabsTrigger value="schools">学校</TabsTrigger>
              <TabsTrigger value="grades">年级</TabsTrigger>
              <TabsTrigger value="classes">班级</TabsTrigger>
            </TabsList>

            <TabsContent value="schools">
              <SchoolsTab />
            </TabsContent>
            <TabsContent value="grades">
              <GradesTab />
            </TabsContent>
            <TabsContent value="classes">
              <ClassesTab />
            </TabsContent>
          </Tabs>
        </div>

        <SchoolDialog onSuccess={loadData} />
        <GradeDialog onSuccess={loadData} />
        <ClassDialog onSuccess={loadData} />
      </PageContent>
    </SchoolsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// 学校 Tab
// ---------------------------------------------------------------------------

function SchoolsTab() {
  const { schools, loading, studentCountBySchoolID, setOpen, setCurrentSchool } =
    useSchoolsContext();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns = useMemo<ColumnDef<SchoolItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="学校名称" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        id: "studentCount",
        header: "学生数",
        cell: ({ row }) => studentCountBySchoolID[row.original.id] || 0,
        enableSorting: false,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="状态" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.getValue("status") === "active" ? "secondary" : "outline"}
          >
            {row.getValue("status") === "active" ? "启用" : "暂停"}
          </Badge>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 data-[state=open]:bg-muted"
              >
                <DotsHorizontalIcon className="h-4 w-4" />
                <span className="sr-only">操作</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setCurrentSchool(row.original);
                  setOpen("edit-school");
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [studentCountBySchoolID, setCurrentSchool, setOpen]
  );

  const table = useReactTable({
    data: schools,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">学校列表</h2>
        <Button
          className="space-x-1"
          onClick={() => {
            setCurrentSchool(null);
            setOpen("add-school");
          }}
        >
          <span>新增学校</span> <Plus size={18} />
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">加载中…</div>
      ) : (
        <>
          <DataTableToolbar
            table={table}
            searchPlaceholder="搜索学校名称…"
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
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="group/row">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="bg-background group-hover/row:bg-muted/50"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
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
                      暂无学校
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 年级 Tab
// ---------------------------------------------------------------------------

function GradesTab() {
  const { grades, loading, setOpen, setCurrentGrade } = useSchoolsContext();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns = useMemo<ColumnDef<GradeItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="年级名称" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "sort",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="排序" />
        ),
        cell: ({ row }) => row.getValue("sort"),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="状态" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.getValue("status") === "active" ? "secondary" : "outline"}
          >
            {row.getValue("status") === "active" ? "启用" : "暂停"}
          </Badge>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 data-[state=open]:bg-muted"
              >
                <DotsHorizontalIcon className="h-4 w-4" />
                <span className="sr-only">操作</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setCurrentGrade(row.original);
                  setOpen("edit-grade");
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [setCurrentGrade, setOpen]
  );

  const table = useReactTable({
    data: grades,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">年级列表</h2>
        <Button
          className="space-x-1"
          onClick={() => {
            setCurrentGrade(null);
            setOpen("add-grade");
          }}
        >
          <span>新增年级</span> <Plus size={18} />
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">加载中…</div>
      ) : (
        <>
          <DataTableToolbar
            table={table}
            searchPlaceholder="搜索年级名称…"
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
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="group/row">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="bg-background group-hover/row:bg-muted/50"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
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
                      暂无年级
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 班级 Tab
// ---------------------------------------------------------------------------

type ClassRow = ClassItem & {
  schoolName: string;
  gradeName: string;
  studentCount: number;
};

function ClassesTab() {
  const {
    classes,
    grades,
    loading,
    schools,
    studentCountByClassID,
    setOpen,
    setCurrentClass,
    setClassPreset,
  } = useSchoolsContext();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // 级联筛选
  const [filterSchoolId, setFilterSchoolId] = useState<string>("__all__");
  const [filterGradeId, setFilterGradeId] = useState<string>("__all__");

  const filteredGrades = useMemo(
    () =>
      filterSchoolId === "__all__"
        ? grades
        : grades,
    [filterSchoolId, grades]
  );

  const rows = useMemo<ClassRow[]>(() => {
    let items = classes;
    if (filterSchoolId !== "__all__") {
      items = items.filter((c) => c.schoolId === filterSchoolId);
    }
    if (filterGradeId !== "__all__") {
      items = items.filter((c) => c.gradeId === filterGradeId);
    }
    return items.map((c) => ({
      ...c,
      schoolName: schools.find((s) => s.id === c.schoolId)?.name || c.schoolName,
      gradeName: grades.find((g) => g.id === c.gradeId)?.name || c.gradeName,
      studentCount: studentCountByClassID[c.id] || 0,
    }));
  }, [classes, schools, grades, studentCountByClassID, filterSchoolId, filterGradeId]);

  const columns = useMemo<ColumnDef<ClassRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="班级名称" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "schoolName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="所属学校" />
        ),
      },
      {
        accessorKey: "gradeName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="所属年级" />
        ),
      },
      {
        accessorKey: "studentCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="学生数" />
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="状态" />
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.getValue("status") === "active" ? "secondary" : "outline"}
          >
            {row.getValue("status") === "active" ? "启用" : "暂停"}
          </Badge>
        ),
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 data-[state=open]:bg-muted"
              >
                <DotsHorizontalIcon className="h-4 w-4" />
                <span className="sr-only">操作</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setCurrentClass(row.original);
                  setOpen("edit-class");
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [setCurrentClass, setOpen]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">班级列表</h2>
        <Button
          className="space-x-1"
          onClick={() => {
            setCurrentClass(null);
            setClassPreset({});
            setOpen("add-class");
          }}
        >
          <span>新增班级</span> <Plus size={18} />
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">加载中…</div>
      ) : (
        <>
          {/* 级联筛选 + 全局搜索 */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">学校</Label>
              <Select
                value={filterSchoolId}
                onValueChange={(v) => {
                  setFilterSchoolId(v);
                  setFilterGradeId("__all__");
                }}
              >
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部学校</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">年级</Label>
              <Select value={filterGradeId} onValueChange={setFilterGradeId}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部年级</SelectItem>
                  {filteredGrades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <DataTableToolbar
                table={table}
                searchPlaceholder="搜索班级名称…"
              />
            </div>
          </div>

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
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="group/row">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="bg-background group-hover/row:bg-muted/50"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
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
                      暂无班级
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 学校 Dialog
// ---------------------------------------------------------------------------

function SchoolDialog({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const { open, setOpen, schools, currentSchool } = useSchoolsContext();
  const isOpen = open === "add-school" || open === "edit-school";
  const isEdit = open === "edit-school";

  const [form, setForm] = useState(initialSchoolForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(
        isEdit && currentSchool
          ? { id: currentSchool.id, name: currentSchool.name, status: currentSchool.status }
          : initialSchoolForm
      );
    }
  }, [isOpen, isEdit, currentSchool]);

  const exactDuplicate = hasExactName(schools, form.name, form.id);
  const similarItems = findSimilarNames(schools, form.name, form.id);

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("学校名称不能为空");
      return;
    }
    if (exactDuplicate) {
      toast.error("学校名称已存在");
      return;
    }
    setSaving(true);
    try {
      await saveSchool({
        id: form.id || undefined,
        name: form.name.trim(),
        status: form.status,
      });
      toast.success("已保存");
      setOpen(null);
      await onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑学校" : "新增学校"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>学校名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            />
          </div>
          <DuplicateAlert exact={exactDuplicate} similarItems={similarItems} />
          <div className="grid gap-2">
            <Label>状态</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((c) => ({ ...c, status: v }))}
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
        </div>
        <DialogFooter>
          <Button disabled={saving || exactDuplicate} onClick={handleSave}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 年级 Dialog
// ---------------------------------------------------------------------------

function GradeDialog({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const { open, setOpen, grades, currentGrade } = useSchoolsContext();
  const isOpen = open === "add-grade" || open === "edit-grade";
  const isEdit = open === "edit-grade";

  const [form, setForm] = useState(initialGradeForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(
        isEdit && currentGrade
          ? {
              id: currentGrade.id,
              name: currentGrade.name,
              sort: String(currentGrade.sort),
              status: currentGrade.status,
            }
          : initialGradeForm
      );
    }
  }, [isOpen, isEdit, currentGrade]);

  const exactDuplicate = hasExactName(grades, form.name, form.id);
  const similarItems = findSimilarNames(grades, form.name, form.id);

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("年级名称不能为空");
      return;
    }
    if (exactDuplicate) {
      toast.error("年级名称已存在");
      return;
    }
    setSaving(true);
    try {
      await saveGrade({
        id: form.id || undefined,
        name: form.name.trim(),
        sort: Number(form.sort || 0),
        status: form.status,
      });
      toast.success("已保存");
      setOpen(null);
      await onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑年级" : "新增年级"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>年级名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            />
          </div>
          <DuplicateAlert exact={exactDuplicate} similarItems={similarItems} />
          <div className="grid gap-2">
            <Label>排序</Label>
            <Input
              value={form.sort}
              onChange={(e) => setForm((c) => ({ ...c, sort: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>状态</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((c) => ({ ...c, status: v }))}
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
        </div>
        <DialogFooter>
          <Button disabled={saving || exactDuplicate} onClick={handleSave}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 班级 Dialog
// ---------------------------------------------------------------------------

function ClassDialog({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const { open, setOpen, schools, grades, classes, currentClass, classPreset } =
    useSchoolsContext();
  const isOpen = open === "add-class" || open === "edit-class";
  const isEdit = open === "edit-class";

  const [form, setForm] = useState(initialClassForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(
        isEdit && currentClass
          ? {
              gradeId: currentClass.gradeId,
              id: currentClass.id,
              name: currentClass.name,
              schoolId: currentClass.schoolId,
              status: currentClass.status,
            }
          : {
              ...initialClassForm,
              gradeId: classPreset.gradeId || grades[0]?.id || "",
              schoolId: classPreset.schoolId || schools[0]?.id || "",
              status: "active",
            }
      );
    }
  }, [isOpen, isEdit, currentClass, classPreset, grades, schools]);

  const exactDuplicate = hasExactName(classes, form.name, form.id);
  const similarItems = findSimilarNames(classes, form.name, form.id);

  async function handleSave() {
    const school = schools.find((s) => s.id === form.schoolId);
    const grade = grades.find((g) => g.id === form.gradeId);
    if (!school || !grade || !form.name.trim()) {
      toast.error("学校、年级、班级名称不能为空");
      return;
    }
    if (exactDuplicate) {
      toast.error("班级名称已存在");
      return;
    }
    setSaving(true);
    try {
      await saveClass({
        gradeId: grade.id,
        gradeName: grade.name,
        id: form.id || undefined,
        name: form.name.trim(),
        schoolId: school.id,
        schoolName: school.name,
        status: form.status,
      });
      toast.success("已保存");
      setOpen(null);
      await onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑班级" : "新增班级"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>学校</Label>
            <Select
              value={form.schoolId}
              onValueChange={(v) => setForm((c) => ({ ...c, schoolId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择学校" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>年级</Label>
            <Select
              value={form.gradeId}
              onValueChange={(v) => setForm((c) => ({ ...c, gradeId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择年级" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>班级名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            />
          </div>
          <DuplicateAlert exact={exactDuplicate} similarItems={similarItems} />
          <div className="grid gap-2">
            <Label>状态</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((c) => ({ ...c, status: v }))}
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
        </div>
        <DialogFooter>
          <Button disabled={saving || exactDuplicate} onClick={handleSave}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 重名提示
// ---------------------------------------------------------------------------

function DuplicateAlert({
  exact,
  similarItems,
}: {
  exact: boolean;
  similarItems: Array<{ id: string; name: string }>;
}) {
  if (!exact && similarItems.length === 0) return null;

  return (
    <Alert variant={exact ? "destructive" : "default"}>
      <AlertTriangle className="size-4" />
      <AlertTitle>{exact ? "名称已存在" : "发现相似名称"}</AlertTitle>
      <AlertDescription>
        {exact
          ? "当前名称不能重复。"
          : similarItems.map((item) => item.name).join("、")}
      </AlertDescription>
    </Alert>
  );
}
