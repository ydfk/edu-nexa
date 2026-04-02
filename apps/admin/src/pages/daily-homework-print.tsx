import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchStudents,
  type ClassItem,
  type DailyHomeworkItem,
  type StudentItem,
} from "@/lib/server-data";

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

type SubjectGroup = { subject: string; lines: string[] };

type ClassGroup = {
  schoolName: string;
  gradeName: string;
  className: string;
  homework: SubjectGroup[];
  students: StudentItem[];
};

// ---------------------------------------------------------------------------
// 按配置顺序分组科目，合并每个科目下的内容行
// ---------------------------------------------------------------------------

function groupBySubjectOrdered(
  items: DailyHomeworkItem[],
  subjectOrder: string[],
): SubjectGroup[] {
  const map = new Map<string, string[]>();
  for (const item of items) {
    const key = item.subject || "未分类";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(...item.content.split("\n").filter(Boolean));
  }

  const result: SubjectGroup[] = [];
  for (const subject of subjectOrder) {
    const lines = map.get(subject);
    if (lines?.length) {
      result.push({ subject, lines });
      map.delete(subject);
    }
  }
  for (const [subject, lines] of map) {
    result.push({ subject, lines });
  }
  return result;
}

// ---------------------------------------------------------------------------
// HTML 转义
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// 通过 iframe 执行打印
// ---------------------------------------------------------------------------

function printViaIframe(
  classGroups: ClassGroup[],
  columns: number,
  displayDate: string,
) {
  const slips = classGroups.flatMap((group) =>
    group.students.map((student) => {
      const subjectsHtml = group.homework
        .map(({ subject, lines }) => {
          const linesHtml = lines
            .map(
              (line, i) =>
                `<div style="padding-left:10px;font-size:11px;line-height:1.6">${
                  lines.length > 1 ? `${i + 1}. ${esc(line)}` : esc(line)
                }</div>`,
            )
            .join("");
          return `<div style="margin-bottom:4px"><div style="font-size:11px;font-weight:600">【${esc(subject)}】</div>${linesHtml}</div>`;
        })
        .join("");

      return `<div style="border:1px dashed #9ca3af;padding:8px;break-inside:avoid">
        <div style="display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid #d1d5db;padding-bottom:4px;margin-bottom:4px">
          <span style="font-size:13px;font-weight:bold">${esc(student.name)}</span>
          <span style="font-size:10px;color:#6b7280">${displayDate}</span>
        </div>
        <div style="font-size:10px;color:#6b7280;margin-bottom:6px">${esc(student.schoolName)} / ${esc(student.grade)} / ${esc(student.className)}</div>
        ${subjectsHtml}
      </div>`;
    }),
  );

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>每日作业 - ${displayDate}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif}
.grid{display:grid;grid-template-columns:repeat(${columns},1fr)}
</style></head>
<body><div class="grid">${slips.join("")}</div></body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  if (!win) return;
  win.addEventListener("afterprint", () => {
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {
        /* 已移除 */
      }
    }, 100);
  });
  win.focus();
  win.print();
}

// ---------------------------------------------------------------------------
// 学生作业单（预览用）
// ---------------------------------------------------------------------------

function StudentSlip({
  student,
  homework,
  displayDate,
}: {
  student: StudentItem;
  homework: SubjectGroup[];
  displayDate: string;
}) {
  return (
    <div className="border border-dashed border-gray-400 p-3">
      <div className="mb-1 flex items-baseline justify-between border-b border-gray-300 pb-1">
        <span className="text-sm font-bold text-black">{student.name}</span>
        <span className="text-[10px] text-gray-500">{displayDate}</span>
      </div>
      <div className="mb-1.5 text-[10px] text-gray-500">
        {student.schoolName} / {student.grade} / {student.className}
      </div>
      <div className="space-y-1">
        {homework.map(({ subject, lines }) => (
          <div key={subject}>
            <div className="text-[11px] font-semibold text-black">
              【{subject}】
            </div>
            {lines.map((line, i) => (
              <div
                key={i}
                className="pl-2.5 text-[11px] leading-relaxed text-black"
              >
                {lines.length > 1 ? `${i + 1}. ${line}` : line}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 打印预览 Dialog
// ---------------------------------------------------------------------------

export function PrintPreviewDialog({
  open,
  onClose,
  items,
  subjects,
  classes,
  serviceDate,
}: {
  open: boolean;
  onClose: () => void;
  items: DailyHomeworkItem[];
  subjects: string[];
  classes: ClassItem[];
  serviceDate: string;
}) {
  const [columns, setColumns] = useState(2);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // 打开时根据作业数据自动查询关联学生
  useEffect(() => {
    if (!open || items.length === 0) {
      if (!open) setClassGroups([]);
      return;
    }

    async function loadStudents() {
      setLoading(true);
      try {
        // 按班级分组作业
        const classMap = new Map<
          string,
          {
            classId: string;
            schoolName: string;
            gradeName: string;
            className: string;
            items: DailyHomeworkItem[];
          }
        >();
        for (const item of items) {
          const key = item.classId || `${item.schoolName}|${item.gradeName}|${item.className}`;
          if (!classMap.has(key)) {
            classMap.set(key, {
              classId: item.classId,
              schoolName: item.schoolName,
              gradeName: item.gradeName,
              className: item.className,
              items: [],
            });
          }
          classMap.get(key)!.items.push(item);
        }

        // 并行查询每个班级的学生
        const entries = Array.from(classMap.entries());
        const studentResults = await Promise.all(
          entries.map(([, { classId, schoolName, gradeName, className }]) => {
            const matchedByID = classes.find((entry) => entry.id === classId);
            const candidates = classes.filter(
              (entry) =>
                entry.schoolName === schoolName &&
                entry.name === className &&
                (!gradeName || entry.gradeName === gradeName),
            );
            const cls = matchedByID || (candidates.length === 1 ? candidates[0] : undefined);
            if (!cls) return Promise.resolve([] as StudentItem[]);
            return fetchStudents({ classId: cls.id, status: "active" });
          }),
        );

        const groups: ClassGroup[] = entries
          .map(([, { classId, schoolName, gradeName, className, items: classItems }], index) => {
            const matchedByID = classes.find((entry) => entry.id === classId);
            const candidates = classes.filter(
              (entry) =>
                entry.schoolName === schoolName &&
                entry.name === className &&
                (!gradeName || entry.gradeName === gradeName),
            );
            const cls = matchedByID || (candidates.length === 1 ? candidates[0] : undefined);
            return {
              schoolName,
              gradeName: gradeName || cls?.gradeName || "",
              className,
              homework: groupBySubjectOrdered(classItems, subjects),
              students: studentResults[index],
            };
          })
          .filter((g) => g.students.length > 0);

        setClassGroups(groups);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "加载学生失败");
      } finally {
        setLoading(false);
      }
    }

    void loadStudents();
  }, [open, items, classes, subjects]);

  const displayDate = useMemo(() => {
    try {
      return format(new Date(serviceDate), "yyyy年M月d日");
    } catch {
      return serviceDate;
    }
  }, [serviceDate]);

  const totalStudents = classGroups.reduce(
    (sum, g) => sum + g.students.length,
    0,
  );

  function handlePrint() {
    printViaIframe(classGroups, columns, displayDate);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>打印预览 — {displayDate}</DialogTitle>
        </DialogHeader>

        {/* 工具栏 */}
        <div className="flex items-center gap-4 border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">每行列数:</span>
            {[1, 2, 3].map((n) => (
              <Button
                key={n}
                variant={columns === n ? "default" : "outline"}
                size="sm"
                className="size-8 p-0"
                onClick={() => setColumns(n)}
              >
                {n}
              </Button>
            ))}
          </div>
          {!loading && totalStudents > 0 && (
            <span className="text-sm text-muted-foreground">
              共 {classGroups.length} 个班级，{totalStudents} 名学生
            </span>
          )}
        </div>

        {/* 预览区域 */}
        <div className="flex-1 overflow-auto rounded border bg-white p-2">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              正在加载学生信息…
            </div>
          ) : totalStudents === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              当日没有需要打印的学生作业
            </div>
          ) : (
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {classGroups.flatMap((group) =>
                group.students.map((student) => (
                  <StudentSlip
                    key={student.id}
                    student={student}
                    homework={group.homework}
                    displayDate={displayDate}
                  />
                )),
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
          <Button
            onClick={handlePrint}
            disabled={loading || totalStudents === 0}
          >
            <Printer className="mr-2 size-4" />
            打印
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
