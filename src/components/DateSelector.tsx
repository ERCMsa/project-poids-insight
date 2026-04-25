import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type Granularity = "day" | "month" | "year" | "all";

export type DateSelection = {
  granularity: Granularity;
  year?: number;
  month?: number; // 1-12
  day?: number;   // 1-31
};

type Props = {
  value: DateSelection;
  onChange: (v: DateSelection) => void;
  /** Years available in the underlying data (optional, fallback to current ±5) */
  availableYears?: number[];
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DateSelector = ({ value, onChange, availableYears }: Props) => {
  const years = useMemo(() => {
    if (availableYears && availableYears.length) {
      return [...new Set(availableYears)].sort((a, b) => b - a);
    }
    const now = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => now - i);
  }, [availableYears]);

  const daysInMonth = useMemo(() => {
    if (!value.year || !value.month) return 31;
    return new Date(value.year, value.month, 0).getDate();
  }, [value.year, value.month]);

  const setGranularity = (g: Granularity) => {
    const now = new Date();
    onChange({
      granularity: g,
      year: value.year ?? now.getFullYear(),
      month: g === "month" || g === "day" ? value.month ?? now.getMonth() + 1 : undefined,
      day: g === "day" ? value.day ?? now.getDate() : undefined,
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">View</Label>
        <Select value={value.granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <SelectTrigger className="h-9 w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="year">Year</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.granularity !== "all" && (
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Year</Label>
          <Select
            value={String(value.year ?? new Date().getFullYear())}
            onValueChange={(v) => onChange({ ...value, year: Number(v) })}
          >
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(value.granularity === "month" || value.granularity === "day") && (
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Month</Label>
          <Select
            value={String(value.month ?? new Date().getMonth() + 1)}
            onValueChange={(v) => onChange({ ...value, month: Number(v) })}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {String(i + 1).padStart(2, "0")} — {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {value.granularity === "day" && (
        <div className="flex flex-col gap-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Day</Label>
          <Select
            value={String(value.day ?? new Date().getDate())}
            onValueChange={(v) => onChange({ ...value, day: Number(v) })}
          >
            <SelectTrigger className="h-9 w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {String(d).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export function formatSelectionLabel(sel: DateSelection): string {
  if (sel.granularity === "all") return "All time";
  if (sel.granularity === "year") return `${sel.year}`;
  if (sel.granularity === "month") {
    return `${String(sel.month).padStart(2, "0")}/${sel.year}`;
  }
  return `${String(sel.day).padStart(2, "0")}/${String(sel.month).padStart(2, "0")}/${sel.year}`;
}
