import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, ChevronsUpDown, School2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ClassItem, SchoolItem } from "@/lib/server-data";

// ---------------------------------------------------------------------------
// 树结构：学校 → 年级 → 班级
// ---------------------------------------------------------------------------

type GradeNode = {
  gradeId: string;
  gradeName: string;
  classes: ClassItem[];
};

type SchoolNode = {
  school: SchoolItem;
  grades: GradeNode[];
};

function buildTree(schools: SchoolItem[], classes: ClassItem[]): SchoolNode[] {
  return schools.map((school) => {
    const schoolClasses = classes.filter((c) => c.schoolId === school.id);
    const gradeMap = new Map<string, GradeNode>();
    for (const cls of schoolClasses) {
      if (!gradeMap.has(cls.gradeId)) {
        gradeMap.set(cls.gradeId, {
          gradeId: cls.gradeId,
          gradeName: cls.gradeName,
          classes: [],
        });
      }
      gradeMap.get(cls.gradeId)!.classes.push(cls);
    }
    return {
      school,
      grades: Array.from(gradeMap.values()),
    };
  });
}

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

export function SchoolClassCascader({
  schools,
  classes,
  schoolId,
  classId,
  onSelect,
}: {
  schools: SchoolItem[];
  classes: ClassItem[];
  schoolId: string;
  classId: string;
  onSelect: (schoolId: string, classId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const tree = useMemo(() => buildTree(schools, classes), [schools, classes]);

  const displayLabel = useMemo(() => {
    if (!classId) {
      if (!schoolId) return "";
      const school = schools.find((s) => s.id === schoolId);
      return school?.name || "";
    }
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return "";
    return `${cls.schoolName} / ${cls.gradeName} / ${cls.name}`;
  }, [schoolId, classId, schools, classes]);

  const handleSelect = useCallback(
    (selectedClassId: string) => {
      const cls = classes.find((c) => c.id === selectedClassId);
      if (cls) {
        onSelect(cls.schoolId, selectedClassId);
      }
      setOpen(false);
    },
    [classes, onSelect],
  );

  useEffect(() => {
    if (classes.length !== 1) {
      return;
    }

    const [onlyClass] = classes;
    if (!onlyClass || classId === onlyClass.id) {
      return;
    }

    onSelect(onlyClass.schoolId, onlyClass.id);
  }, [classId, classes, onSelect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <School2 className="size-4 shrink-0 text-muted-foreground" />
            {displayLabel || (
              <span className="text-muted-foreground">选择学校 / 年级 / 班级</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索学校或班级…" />
          <CommandList>
            <CommandEmpty>未找到匹配项</CommandEmpty>
            {tree.map((node) => (
              <CommandGroup
                key={node.school.id}
                heading={node.school.name}
              >
                {node.grades.map((grade) =>
                  grade.classes.map((cls) => (
                    <CommandItem
                      key={cls.id}
                      value={`${node.school.name} ${grade.gradeName} ${cls.name}`}
                      onSelect={() => handleSelect(cls.id)}
                    >
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <ChevronRight className="size-3" />
                        {grade.gradeName}
                        <ChevronRight className="size-3" />
                      </span>
                      {cls.name}
                      <Check
                        className={cn(
                          "ml-auto size-4",
                          classId === cls.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  )),
                )}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
