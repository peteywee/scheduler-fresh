import { differenceInMinutes } from "date-fns";

export function computeHours(
  clockInMs: number,
  clockOutMs: number,
  rounding: "nearest-15" | "nearest-5" | "none" = "none",
): number {
  const rawMin = Math.max(
    0,
    differenceInMinutes(new Date(clockOutMs), new Date(clockInMs)),
  );
  const step =
    rounding === "nearest-15" ? 15 : rounding === "nearest-5" ? 5 : 1;
  const roundedMin = Math.round(rawMin / step) * step;
  return Math.round((roundedMin / 60) * 100) / 100;
}

export function derivePeriodId(
  atMs: number,
  period: "weekly" | "biweekly" | "monthly",
): string {
  const d = new Date(atMs);
  const y = d.getUTCFullYear();
  if (period === "monthly") {
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-M${m}`;
  }
  // weekly/biweekly based on ISO week
  const { isoYear, isoWeek } = isoWeekOfYear(d);
  if (period === "weekly") {
    return `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
  }
  // biweekly: odd/even bucket
  const bi = Math.ceil(isoWeek / 2);
  return `${isoYear}-BW${String(bi).padStart(2, "0")}`;
}

// Minimal ISO week calculator (to avoid extra deps)
function isoWeekOfYear(date: Date): { isoYear: number; isoWeek: number } {
  const tmp = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // Thursday in current week determines the year
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { isoYear: tmp.getUTCFullYear(), isoWeek: weekNo };
}
