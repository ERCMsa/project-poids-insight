import { useMemo } from "react";
import { PoidsEntry, Source, SOURCE_COLORS, SOURCE_LABELS } from "@/lib/api";
import { sumPoids, groupByProject, groupByMonth, groupByDay, formatPoids } from "@/lib/poids-utils";
import { ChartCard } from "@/components/ChartCard";
import { PoidsBarChart } from "@/components/PoidsBarChart";
import { Trophy } from "lucide-react";

type Props = {
  source: Source;
  entries: PoidsEntry[];
  label: string;
};

export const SourceStatsBlock = ({ source, entries, label }: Props) => {
  const total = useMemo(() => sumPoids(entries), [entries]);
  // Use day grouping when range is short, otherwise monthly
  const trend = useMemo(() => {
    const monthly = groupByMonth(entries);
    if (monthly.length <= 1) return groupByDay(entries);
    return monthly;
  }, [entries]);
  const ranking = useMemo(() => groupByProject(entries).slice(0, 5), [entries]);
  const color = SOURCE_COLORS[source];

  return (
    <div className="rounded-2xl border border-border/60 gradient-card p-5 shadow-card animate-slide-up space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <h3 className="text-base font-semibold tracking-tight truncate">{SOURCE_LABELS[source]}</h3>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="text-lg font-bold tabular-nums">
            {formatPoids(total)} <span className="text-xs font-normal text-muted-foreground">kg</span>
          </p>
        </div>
      </div>

      <ChartCard title="Trend" description={`${SOURCE_LABELS[source]} · ${label}`}>
        {trend.length > 0 ? (
          <PoidsBarChart
            data={trend}
            series={[{ key: "total", label: SOURCE_LABELS[source], color }]}
            height={200}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">No data</p>
        )}
      </ChartCard>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Top 5 projects
        </p>
        <div className="space-y-2">
          {ranking.map((p, i) => {
            const max = ranking[0]?.total || 1;
            const pct = (p.total / max) * 100;
            return (
              <div key={p.project} className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-md bg-secondary text-secondary-foreground grid place-items-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium truncate flex items-center gap-1">
                      {p.project}
                      {i === 0 && <Trophy className="h-3 w-3 text-warning shrink-0" />}
                    </span>
                    <span className="text-xs font-semibold tabular-nums shrink-0">
                      {formatPoids(p.total)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {ranking.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">No data</p>
          )}
        </div>
      </div>
    </div>
  );
};
