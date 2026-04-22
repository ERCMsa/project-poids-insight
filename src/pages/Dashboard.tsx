import { useMemo } from "react";
import { Calendar, CalendarDays, CalendarRange, TrendingUp, Trophy, Loader2, AlertCircle, Activity } from "lucide-react";
import { useAllPoids } from "@/hooks/usePoidsData";
import { filterByPeriod, sumPoids, groupByProject, groupByDay, formatPoids } from "@/lib/poids-utils";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { PoidsLineChart } from "@/components/PoidsLineChart";
import { SOURCE_COLORS, SOURCE_LABELS, Source } from "@/lib/api";
import { format, parseISO } from "date-fns";

const Dashboard = () => {
  const { data, isLoading, error } = useAllPoids();

  const merged = useMemo(() => {
    if (!data) return [];
    return [
      ...data.fabrication.map((d) => ({ ...d, source: "fabrication" as Source })),
      ...data.sortie.map((d) => ({ ...d, source: "sortie" as Source })),
      ...data.montage.map((d) => ({ ...d, source: "montage" as Source })),
    ];
  }, [data]);

  const stats = useMemo(() => {
    return {
      today: sumPoids(filterByPeriod(merged, "day")),
      week: sumPoids(filterByPeriod(merged, "week")),
      month: sumPoids(filterByPeriod(merged, "month")),
      year: sumPoids(filterByPeriod(merged, "year")),
    };
  }, [merged]);

  const lineData = useMemo(() => {
    if (!data) return [];
    const last90 = (entries: typeof merged) =>
      entries.filter((e) => Date.now() - new Date(e.date).getTime() < 1000 * 60 * 60 * 24 * 90);

    const fab = groupByDay(last90(data.fabrication.map((d) => ({ ...d, source: "fabrication" as Source }))));
    const sor = groupByDay(last90(data.sortie.map((d) => ({ ...d, source: "sortie" as Source }))));
    const mon = groupByDay(last90(data.montage.map((d) => ({ ...d, source: "montage" as Source }))));

    const allDates = new Set([...fab.map((d) => d.date), ...sor.map((d) => d.date), ...mon.map((d) => d.date)]);
    return Array.from(allDates)
      .sort()
      .map((date) => ({
        date,
        fabrication: fab.find((d) => d.date === date)?.total || 0,
        sortie: sor.find((d) => d.date === date)?.total || 0,
        montage: mon.find((d) => d.date === date)?.total || 0,
      }));
  }, [data]);

  const topProjects = useMemo(() => groupByProject(merged).slice(0, 5), [merged]);
  const recent = useMemo(
    () =>
      [...merged].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
    [merged]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Loading poids data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-destructive">
        <AlertCircle className="h-8 w-8 mb-3" />
        <p className="text-sm">Failed to load data. Please retry.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global overview across Fabrication, Sortie & Montage
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-success animate-pulse" />
          Auto-refresh · 60s
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Today" value={stats.today} icon={Calendar} variant="primary" />
        <KpiCard label="This Week" value={stats.week} icon={CalendarDays} variant="accent" />
        <KpiCard label="This Month" value={stats.month} icon={CalendarRange} variant="success" />
        <KpiCard label="This Year" value={stats.year} icon={TrendingUp} variant="warning" />
      </div>

      <ChartCard
        title="Poids evolution"
        description="Last 90 days, all sources"
      >
        <PoidsLineChart
          data={lineData}
          series={(["fabrication", "sortie", "montage"] as Source[]).map((s) => ({
            key: s,
            label: SOURCE_LABELS[s],
            color: SOURCE_COLORS[s],
          }))}
          height={320}
        />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Top 5 projects" description="Total poids across all sources">
          <div className="space-y-3">
            {topProjects.map((p, i) => {
              const max = topProjects[0]?.total || 1;
              const pct = (p.total / max) * 100;
              return (
                <div key={p.project} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-6 w-6 rounded-md bg-secondary text-secondary-foreground grid place-items-center text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="truncate font-medium">{p.project}</span>
                      {i === 0 && <Trophy className="h-3.5 w-3.5 text-warning shrink-0" />}
                    </div>
                    <span className="tabular-nums font-semibold text-sm shrink-0">{formatPoids(p.total)} kg</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full gradient-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Recent activity" description="Latest entries across all sources">
          <div className="space-y-2">
            {recent.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-base"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-8 w-1 rounded-full shrink-0"
                    style={{ backgroundColor: SOURCE_COLORS[r.source] }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.project}</p>
                    <p className="text-xs text-muted-foreground">
                      {SOURCE_LABELS[r.source]} ·{" "}
                      {(() => {
                        try {
                          return format(parseISO(r.date), "dd MMM yyyy HH:mm");
                        } catch {
                          return r.date;
                        }
                      })()}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">{formatPoids(r.totalPoids)} kg</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default Dashboard;
