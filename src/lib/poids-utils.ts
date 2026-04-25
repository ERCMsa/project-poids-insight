import { PoidsEntry } from "./api";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  isAfter,
  isBefore,
  format,
} from "date-fns";

export type Period = "day" | "week" | "month" | "year" | "all";

export function periodStart(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "day":
      return startOfDay(now);
    case "week":
      return startOfWeek(now, { weekStartsOn: 1 });
    case "month":
      return startOfMonth(now);
    case "year":
      return startOfYear(now);
    case "all":
      return new Date(0);
  }
}

export function filterByPeriod(entries: PoidsEntry[], period: Period) {
  const start = periodStart(period);
  return entries.filter((e) => isAfter(new Date(e.date), start) || +new Date(e.date) === +start);
}

export type DateSelection = {
  granularity: "day" | "month" | "year" | "all";
  year?: number;
  month?: number;
  day?: number;
};

export function filterBySelection(entries: PoidsEntry[], sel: DateSelection) {
  if (sel.granularity === "all") return entries;
  return entries.filter((e) => {
    const d = new Date(e.date);
    if (sel.year !== undefined && d.getFullYear() !== sel.year) return false;
    if ((sel.granularity === "month" || sel.granularity === "day") && sel.month !== undefined) {
      if (d.getMonth() + 1 !== sel.month) return false;
    }
    if (sel.granularity === "day" && sel.day !== undefined) {
      if (d.getDate() !== sel.day) return false;
    }
    return true;
  });
}

export function extractYears(entries: PoidsEntry[]): number[] {
  const set = new Set<number>();
  for (const e of entries) {
    const y = new Date(e.date).getFullYear();
    if (!isNaN(y)) set.add(y);
  }
  return Array.from(set).sort((a, b) => b - a);
}

export function filterByDateRange(entries: PoidsEntry[], from?: Date, to?: Date) {
  return entries.filter((e) => {
    const d = new Date(e.date);
    if (from && isBefore(d, startOfDay(from))) return false;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (isAfter(d, end)) return false;
    }
    return true;
  });
}

export function sumPoids(entries: PoidsEntry[]) {
  return entries.reduce((acc, e) => acc + (e.totalPoids || 0), 0);
}

export function groupByProject(entries: PoidsEntry[]) {
  const map = new Map<string, number>();
  for (const e of entries) {
    map.set(e.project, (map.get(e.project) || 0) + (e.totalPoids || 0));
  }
  return Array.from(map.entries())
    .map(([project, total]) => ({ project, total }))
    .sort((a, b) => b.total - a.total);
}

export function groupByDay(entries: PoidsEntry[]) {
  const map = new Map<string, number>();
  for (const e of entries) {
    const key = format(new Date(e.date), "yyyy-MM-dd");
    map.set(key, (map.get(key) || 0) + (e.totalPoids || 0));
  }
  return Array.from(map.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function groupByMonth(entries: PoidsEntry[]) {
  const map = new Map<string, number>();
  for (const e of entries) {
    const key = format(new Date(e.date), "yyyy-MM");
    map.set(key, (map.get(key) || 0) + (e.totalPoids || 0));
  }
  return Array.from(map.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatPoids(n: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

export function exportToCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = String(r[h] ?? "");
          return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
