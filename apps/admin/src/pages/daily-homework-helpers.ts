import {
  type ClassItem,
  type DailyHomeworkItem,
  type SchoolItem,
} from "@/lib/server-data";

export function findHomeworkClass(
  item: DailyHomeworkItem,
  schools: SchoolItem[],
  classes: ClassItem[],
) {
  const school =
    schools.find((entry) => entry.id === item.schoolId) ||
    schools.find((entry) => entry.name === item.schoolName);
  const matchedByID = classes.find((entry) => entry.id === item.classId);
  if (matchedByID) {
    return matchedByID;
  }

  const candidates = classes.filter(
    (entry) =>
      entry.name === item.className &&
      (!item.gradeName || entry.gradeName === item.gradeName) &&
      ((school?.id && entry.schoolId === school.id) || entry.schoolName === item.schoolName),
  );
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function getHomeworkContentLines(item: Pick<DailyHomeworkItem, "content" | "items">) {
  const items = item.items || [];
  if (items.length > 0) {
    return [...items]
      .sort((a, b) => a.sort - b.sort)
      .map((entry) => entry.content.trim())
      .filter(Boolean);
  }

  return item.content
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
