import { Period } from "@/lib/poids-utils";
import { cn } from "@/lib/utils";

const options: { value: Period; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

type Props = {
  value: Period;
  onChange: (v: Period) => void;
};

export const PeriodFilter = ({ value, onChange }: Props) => {
  return (
    <div className="inline-flex p-1 rounded-xl bg-secondary border border-border/60">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-lg transition-base",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
