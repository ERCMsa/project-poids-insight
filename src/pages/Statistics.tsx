import { useMemo, useState } from "react";
import { useAllPoids } from "@/hooks/usePoidsData";
import {
  filterByPeriod,
  sumPoids,
  groupByProject,
  groupByMonth,
  formatPoids,
  Period,
  exportToCSV,
} from "@/lib/poids-utils";
import { Source, SOURCE_COLORS, SOURCE_LABELS } from "@/lib/api";
import { ChartCard } from "@/components/ChartCard";
import { PoidsBarChart } from "@/components/PoidsBarChart";
import { PeriodFilter } from "@/components/PeriodFilter";
import { KpiCard } from "@/components/KpiCard";
import { Loader2, AlertCircle, GitCompare, Trophy, TrendingUp, TrendingDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { startOfWeek, subWeeks, isAfter, isBefore } from "date-fns";

const Statistics = () => {
  const { data, isLoading, error } = useAllPoids();
  const [period, setPeriod] = useState<Period>("year");

  const sources: Source[] = ["fabrication", "sortie", "montage"];

  const totalsBySource = useMemo(() => {
    if (!data) return [] as { source: Source; total: number }[];
    return sources.map((s) => ({
      source: s,
      total: sumPoids(filterByPeriod(data[s], period)),
    }));
  }, [data, period]);

  const grandTotal = totalsBySource.reduce((a, b) => a + b.total, 0);

  // Stacked bar by month
  const stackedMonthly = useMemo(() => {
    if (!data) return [];
    const fab = groupByMonth(filterByPeriod(data.fabrication, period));
    const sor = groupByMonth(filterByPeriod(data.sortie, period));
    const mon = groupByMonth(filterByPeriod(data.montage, period));
    const dates = new Set([...fab.map((d) => d.date), ...sor.map((d) => d.date), ...mon.map((d) => d.date)]);
    return Array.from(dates)
      .sort()
      .map((date) => ({
        date,
        fabrication: fab.find((d) => d.date === date)?.total || 0,
        sortie: sor.find((d) => d.date === date)?.total || 0,
        montage: mon.find((d) => d.date === date)?.total || 0,
      }));
  }, [data, period]);

  // Best performing project (across all sources)
  const bestProject = useMemo(() => {
    if (!data) return null;
    const all = [...data.fabrication, ...data.sortie, ...data.montage];
    return groupByProject(filterByPeriod(all, period))[0];
  }, [data, period]);

  // Week-over-week comparison
  const weekComparison = useMemo(() => {
    if (!data) return { thisWeek: 0, lastWeek: 0, growth: 0 };
    const all = [...data.fabrication, ...data.sortie, ...data.montage];
    const startThis = startOfWeek(new Date(), { weekStartsOn: 1 });
    const startLast = subWeeks(startThis, 1);
    const thisWeek = sumPoids(all.filter((e) => isAfter(new Date(e.date), startThis)));
    const lastWeek = sumPoids(
      all.filter((e) => isAfter(new Date(e.date), startLast) && isBefore(new Date(e.date), startThis))
    );
    const growth = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
    return { thisWeek, lastWeek, growth };
  }, [data]);

  // Project ranking
  const ranking = useMemo(() => {
    if (!data) return [];
    const all = [...data.fabrication, ...data.sortie, ...data.montage];
    return groupByProject(filterByPeriod(all, period)).slice(0, 10);
  }, [data, period]);

  const handleExport = () => {
    if (!data) return;
    const all = [
      ...data.fabrication.map((d) => ({ ...d, source: "fabrication" })),
      ...data.sortie.map((d) => ({ ...d, source: "sortie" })),
      ...data.montage.map((d) => ({ ...d, source: "montage" })),
    ];
    exportToCSV("statistics-all-sources.csv", all);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-destructive">
        <AlertCircle className="h-8 w-8 mb-3" />
        <p className="text-sm">Failed to load data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare sources, trends and rank projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter value={period} onChange={setPeriod} />
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export all
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Grand Total" value={grandTotal} icon={GitCompare} variant="primary" />
        <KpiCard
          label="Best Project"
          value={bestProject?.total || 0}
          icon={Trophy}
          variant="warning"
        />
        <KpiCard
          label="This Week"
          value={weekComparison.thisWeek}
          icon={TrendingUp}
          variant="success"
          trend={{ value: weekComparison.growth, label: "vs last week" }}
        />
        <KpiCard
          label="Last Week"
          value={weekComparison.lastWeek}
          icon={TrendingDown}
          variant="accent"
        />
      </div>

      {bestProject && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 flex items-center gap-3 animate-fade-in">
          <Trophy className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">{bestProject.project}</span> is the best performing project for{" "}
            <span className="font-semibold">{period}</span> with{" "}
            <span className="font-semibold">{formatPoids(bestProject.total)} kg</span>.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Source breakdown"
          description="Distribution of poids by source"
          className="lg:col-span-1"
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={totalsBySource.map((t) => ({ name: SOURCE_LABELS[t.source], value: t.total }))}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {totalsBySource.map((t, i) => (
                  <Cell key={i} fill={SOURCE_COLORS[t.source]} stroke="hsl(var(--background))" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
                formatter={(v: number) => formatPoids(v) + " kg"}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {totalsBySource.map((t) => (
              <div key={t.source} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[t.source] }} />
                  <span>{SOURCE_LABELS[t.source]}</span>
                </div>
                <span className="font-semibold tabular-nums">{formatPoids(t.total)}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Monthly comparison"
          description="Stacked totals by source"
          className="lg:col-span-2"
        >
          {stackedMonthly.length > 0 ? (
            <PoidsBarChart
              data={stackedMonthly}
              series={sources.map((s) => ({
                key: s,
                label: SOURCE_LABELS[s],
                color: SOURCE_COLORS[s],
              }))}
              stacked
              height={300}
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground py-12">No data</p>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Project ranking" description={`Top 10 projects · ${period}`}>
        <div className="space-y-2">
          {ranking.map((p, i) => {
            const max = ranking[0]?.total || 1;
            const pct = (p.total / max) * 100;
            return (
              <div key={p.project} className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-md bg-secondary text-secondary-foreground grid place-items-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{p.project}</span>
                    <span className="text-sm font-semibold tabular-nums shrink-0">{formatPoids(p.total)} kg</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background:
                          i === 0
                            ? "var(--gradient-warning)"
                            : i < 3
                            ? "var(--gradient-primary)"
                            : "hsl(var(--muted-foreground))",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {ranking.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No data</p>}
        </div>
      </ChartCard>
    </div>
  );
};

export default Statistics;
