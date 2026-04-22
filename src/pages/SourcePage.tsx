import { useMemo, useState } from "react";
import { Source, SOURCE_COLORS, SOURCE_LABELS } from "@/lib/api";
import { useSourcePoids } from "@/hooks/usePoidsData";
import { filterByPeriod, sumPoids, groupByProject, groupByDay, formatPoids, exportToCSV, Period } from "@/lib/poids-utils";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/ChartCard";
import { PoidsLineChart } from "@/components/PoidsLineChart";
import { PoidsBarChart } from "@/components/PoidsBarChart";
import { PeriodFilter } from "@/components/PeriodFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Download, Search, Package, TrendingUp, Hash, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

type Props = { source: Source };

const SourcePage = ({ source }: Props) => {
  const { data, isLoading, error } = useSourcePoids(source);
  const [period, setPeriod] = useState<Period>("month");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const projectsList = useMemo(() => {
    if (!data) return [];
    const grouped = groupByProject(data);
    return grouped.filter((p) => p.project.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let res = filterByPeriod(data, period);
    if (selectedProject) res = res.filter((d) => d.project === selectedProject);
    return res;
  }, [data, period, selectedProject]);

  const total = sumPoids(filtered);
  const entries = filtered.length;
  const avg = entries ? total / entries : 0;

  // anomaly detection: spikes > 2x average
  const anomalies = filtered.filter((e) => avg > 0 && e.totalPoids > avg * 2.5).length;

  const chartData = useMemo(() => {
    return groupByDay(filtered).map((d) => ({ date: d.date, total: d.total }));
  }, [filtered]);

  const tableRows = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [filtered]
  );

  const handleExport = () => {
    exportToCSV(
      `${source}-${period}-${selectedProject || "all"}.csv`,
      tableRows.map((r) => ({
        project: r.project,
        date: r.date,
        totalPoids: r.totalPoids,
      }))
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Loading {SOURCE_LABELS[source]} data...</p>
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
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: SOURCE_COLORS[source] }}
            />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{SOURCE_LABELS[source]}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedProject ? `Project: ${selectedProject}` : "All projects"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodFilter value={period} onChange={setPeriod} />
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard label={`Total · ${period}`} value={total} icon={Package} variant="primary" />
        <KpiCard label="Entries" value={entries} icon={Hash} variant="accent" suffix="" />
        <KpiCard label="Average" value={avg} icon={TrendingUp} variant="success" />
        <KpiCard label="Anomalies" value={anomalies} icon={AlertTriangle} variant="warning" suffix="" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Project list */}
        <ChartCard
          title="Projects"
          description={`${projectsList.length} project(s)`}
          action={
            selectedProject && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedProject(null)}>
                Clear
              </Button>
            )
          }
        >
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-9 h-9"
            />
          </div>
          <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {projectsList.map((p) => (
              <button
                key={p.project}
                onClick={() => setSelectedProject(p.project === selectedProject ? null : p.project)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 p-2.5 rounded-lg text-left transition-base",
                  selectedProject === p.project
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                )}
              >
                <span className="text-sm font-medium truncate">{p.project}</span>
                <span
                  className={cn(
                    "text-xs tabular-nums shrink-0",
                    selectedProject === p.project ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {formatPoids(p.total)}
                </span>
              </button>
            ))}
            {projectsList.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No projects found</p>
            )}
          </div>
        </ChartCard>

        {/* Right column */}
        <div className="space-y-6">
          <ChartCard title="Poids over time" description={`Daily totals for ${period}`}>
            {chartData.length > 0 ? (
              chartData.length > 14 ? (
                <PoidsLineChart
                  data={chartData}
                  series={[{ key: "total", label: SOURCE_LABELS[source], color: SOURCE_COLORS[source] }]}
                />
              ) : (
                <PoidsBarChart
                  data={chartData}
                  series={[{ key: "total", label: SOURCE_LABELS[source], color: SOURCE_COLORS[source] }]}
                />
              )
            ) : (
              <p className="text-center text-sm text-muted-foreground py-12">No data for this period</p>
            )}
          </ChartCard>

          <ChartCard title="Detailed entries" description={`${tableRows.length} entries`}>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border/60">
                    <th className="font-medium text-xs uppercase tracking-wider text-muted-foreground py-2 px-2">Date</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-muted-foreground py-2 px-2">Project</th>
                    <th className="font-medium text-xs uppercase tracking-wider text-muted-foreground py-2 px-2 text-right">Poids (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.slice(0, 50).map((r, i) => {
                    const isAnomaly = avg > 0 && r.totalPoids > avg * 2.5;
                    return (
                      <tr key={i} className="border-b border-border/30 hover:bg-secondary/40 transition-base">
                        <td className="py-2.5 px-2 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {(() => {
                            try {
                              return format(parseISO(r.date), "dd MMM yyyy HH:mm");
                            } catch {
                              return r.date;
                            }
                          })()}
                        </td>
                        <td className="py-2.5 px-2 truncate max-w-[240px]">{r.project}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-semibold">
                          <span className={cn("inline-flex items-center gap-1.5", isAnomaly && "text-warning")}>
                            {isAnomaly && <AlertTriangle className="h-3 w-3" />}
                            {formatPoids(r.totalPoids)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {tableRows.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No entries</p>
              )}
              {tableRows.length > 50 && (
                <p className="text-center text-xs text-muted-foreground py-3">
                  Showing 50 of {tableRows.length} entries — export for full data
                </p>
              )}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default SourcePage;
