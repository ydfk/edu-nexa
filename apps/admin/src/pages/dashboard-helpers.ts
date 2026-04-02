import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import type {
  HomeworkRecordItem,
  MealRecordItem,
  PaymentRecordItem,
  StudentItem,
} from "@/lib/server-data";

export type DashboardTrendPoint = {
  date: string;
  homework: number;
  label: string;
  meals: number;
};

export type SchoolOverviewRow = {
  homeworkCount: number;
  mealCount: number;
  schoolName: string;
  studentCount: number;
};

export function calculateMonthlyPaymentAmount(
  paymentRecords: PaymentRecordItem[],
  today: string,
) {
  const currentDate = parseISO(today);
  const range = {
    end: endOfMonth(currentDate),
    start: startOfMonth(currentDate),
  };

  return paymentRecords.reduce((total, record) => {
    if (!record.paidAt) {
      return total;
    }

    const paidAt = parseISO(record.paidAt);
    return isWithinInterval(paidAt, range) ? total + record.paymentAmount : total;
  }, 0);
}

export function buildSevenDayTrendData(
  mealRecords: MealRecordItem[],
  homeworkRecords: HomeworkRecordItem[],
  today: string,
): DashboardTrendPoint[] {
  const end = parseISO(today);
  const start = subDays(end, 6);
  const trendMap = new Map<string, DashboardTrendPoint>(
    eachDayOfInterval({ end, start }).map((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      return [
        dateKey,
        {
          date: dateKey,
          homework: 0,
          label: format(day, "M/d"),
          meals: 0,
        },
      ];
    }),
  );

  for (const item of mealRecords) {
    if (item.status !== "completed") {
      continue;
    }

    const trendPoint = trendMap.get(item.serviceDate);
    if (trendPoint) {
      trendPoint.meals += 1;
    }
  }

  for (const item of homeworkRecords) {
    if (!["completed", "partial"].includes(item.status)) {
      continue;
    }

    const trendPoint = trendMap.get(item.serviceDate);
    if (trendPoint) {
      trendPoint.homework += 1;
    }
  }

  return [...trendMap.values()];
}

export function buildSchoolOverviewRows(
  students: StudentItem[],
  mealRecords: MealRecordItem[],
  homeworkRecords: HomeworkRecordItem[],
  today: string,
): SchoolOverviewRow[] {
  const visibleDates = new Set(
    buildSevenDayTrendData(mealRecords, homeworkRecords, today).map((item) => item.date),
  );
  const studentSchoolMap = new Map(
    students.map((student) => [student.id, student.schoolName]),
  );
  const schoolOverviewMap = new Map<string, SchoolOverviewRow>();

  for (const student of students) {
    const row = schoolOverviewMap.get(student.schoolName);
    if (row) {
      row.studentCount += 1;
      continue;
    }

    schoolOverviewMap.set(student.schoolName, {
      homeworkCount: 0,
      mealCount: 0,
      schoolName: student.schoolName,
      studentCount: 1,
    });
  }

  for (const item of mealRecords) {
    if (item.status !== "completed" || !visibleDates.has(item.serviceDate)) {
      continue;
    }

    const schoolName = studentSchoolMap.get(item.studentId);
    if (!schoolName) {
      continue;
    }

    const row = schoolOverviewMap.get(schoolName);
    if (row) {
      row.mealCount += 1;
    }
  }

  for (const item of homeworkRecords) {
    if (!["completed", "partial"].includes(item.status) || !visibleDates.has(item.serviceDate)) {
      continue;
    }

    const schoolName = studentSchoolMap.get(item.studentId) || item.schoolName;
    if (!schoolName) {
      continue;
    }

    const row = schoolOverviewMap.get(schoolName);
    if (row) {
      row.homeworkCount += 1;
    }
  }

  return [...schoolOverviewMap.values()].sort((left, right) => {
    if (right.studentCount !== left.studentCount) {
      return right.studentCount - left.studentCount;
    }

    return left.schoolName.localeCompare(right.schoolName, "zh-CN");
  });
}
