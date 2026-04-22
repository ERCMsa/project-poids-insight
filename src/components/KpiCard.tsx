import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPoids } from "@/lib/poids-utils";

type Props = {
  label: string;
  value: number;
  icon: LucideIcon;
  variant?: "primary" | "accent" | "success" | "warning";
  trend?: { value: number; label?: string };
  suffix?: string;
};

const variantStyles = {
  primary: "gradient-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  success: "gradient-success text-success-foreground",
  warning: "gradient-warning text-warning-foreground",
};

export const KpiCard = ({ label, value, icon: Icon, variant = "primary", trend, suffix = "kg" }: Props) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 gradient-card p-5 shadow-card hover:shadow-card-lg transition-base animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl md:text-3xl font-bold tracking-tight tabular-nums">
            {formatPoids(value)} <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
          </p>
          {trend && (
            <p
              className={cn(
                "mt-2 text-xs font-medium inline-flex items-center gap-1",
                trend.value >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}%
              {trend.label && <span className="text-muted-foreground font-normal">· {trend.label}</span>}
            </p>
          )}
        </div>
        <div className={cn("h-11 w-11 rounded-xl grid place-items-center shrink-0 shadow-sm", variantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
