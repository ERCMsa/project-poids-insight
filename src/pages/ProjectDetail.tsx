import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAllPoids } from "@/hooks/usePoidsData";
import { Source, SOURCE_COLORS, SOURCE_LABELS } from "@/lib/api";
import {
  extractYears,
  filterBySelection,
  sumPoids,
  groupByDay,
  groupByMonth,
  formatPoids,
} from "@/lib/poids-utils";
import { DateSelector, DateSelection, formatSelectionLabel } from "@/components/DateSelector";
import { ChartCard } from "@/components/ChartCard";
import { PoidsBarChart } from "@/components/PoidsBarChart";
import { KpiCard } from "@/components/KpiCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Factory,
  Truck,
  Wrench,
} from "lucide-react";

const ProjectDetail = () => {
  const { project: rawProject } = useParams();
  const project = decodeURIComponent(rawProject ?? "");
  const { data, isLoading, error } = useAllPoids();
  const [selection, setSelection] = useState<DateSelection>({
    granularity: "all",
  });

  const sources: Source[] = ["fabrication", "sortie", "montage"];

  const projectData = useMemo(() => {
    if (!data) return null;
    const out = {} as Record<Source, ReturnType<typeof filterBySelection>>;
    for (const s of sources) {
      const filtered = data[s].filter((e) => e.project === project);
      out[s] = filterBySelection(filtered, selection);
    }
    return out;
  }, [data, project, selection]);

  const availableYears = useMemo(() => {
    if (!data) return [];
    return extractYears([
      ...data.fabrication.filter((e) => e.project === project),
      ...data.sortie.filter((e) => e.project === project),
      ...data.montage.filter((e) => e.project === project),
    ]);
  }, [data, project]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Loading project...</p>
      </div>
    );
  }

  if (error || !data || !projectData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-destructive">
        <AlertCircle className="h-8 w-8 mb-3" />
        <p className="text-sm">Failed to load data.</p>
      </div>
    );
  }

  const totals = {
    fabrication: sumPoids(projectData.fabrication),
    sortie: sumPoids(projectData.sortie),
    montage: sumPoids(projectData.montage),
  };

  const icons = { fabrication: Factory, sortie: Truck, montage: Wrench };
  const variants: Record<Source, "primary" | "accent" | "success"> = {
    fabrication: "primary",
    sortie: "accent",
    montage: "success",
  };

  // Combined trend chart: monthly if range > 1 month else daily
  const combined = useMemo(() => {
    const buckets: Record<string, Record<string, number | string>> = {};
    const useMonth = (() => {
      const all = [...projectData.fabrication, ...projectData.sortie, ...projectData.montage];
      const monthsSet = new Set(all.map((e) => format(new Date(e.date), "yyyy-MM")));
      return monthsSet.size > 1;
    })();
    for (const s of sources) {
      const grouped = useMonth ? groupByMonth(projectData[s]) : groupByDay(projectData[s]);
      for (const g of grouped) {
        if (!buckets[g.date]) buckets[g.date] = { date: g.date };
        buckets[g.date][s] = g.total;
      }
    }
    return Object.values(buckets).sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
  }, [projectData]);

  const allEntries = useMemo(() => {
    const rows: { date: string; source: Source; poids: number }[] = [];
    for (const s of sources) {
      for (const e of projectData[s]) {
        rows.push({ date: e.date, source: s, poids: e.totalPoids });
      }
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [projectData]);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
          <Link to="/projects">
            <ArrowLeft className="h-4 w-4 mr-1" /> All projects
          </Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
              {project}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Viewing{" "}
              <span className="font-medium text-foreground">
                {formatSelectionLabel(selection)}
              </span>
            </p>
          </div>
          <DateSelector
            value={selection}
            onChange={setSelection}
            availableYears={availableYears}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {sources.map((s) => (
          <KpiCard
            key={s}
            label={SOURCE_LABELS[s]}
            value={totals[s]}
            icon={icons[s]}
            variant={variants[s]}
          />
        ))}
      </div>

      <ChartCard
        title="Stages comparison"
        description={`Fabrication vs Sortie vs Montage · ${formatSelectionLabel(selection)}`}
      >
        {combined.length > 0 ? (
          <PoidsBarChart
            data={combined as Array<Record<string, string | number>>}
            series={sources.map((s) => ({
              key: s,
              label: SOURCE_LABELS[s],
              color: SOURCE_COLORS[s],
            }))}
            height={320}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">
            No data for this period
          </p>
        )}
      </ChartCard>

      <ChartCard title="All entries" description={`${allEntries.length} records`}>
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Poids (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allEntries.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">
                    {format(new Date(r.date), "dd MMM yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: SOURCE_COLORS[r.source] }}
                      />
                      {SOURCE_LABELS[r.source]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatPoids(r.poids)}
                  </TableCell>
                </TableRow>
              ))}
              {allEntries.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    No entries
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ChartCard>
    </div>
  );
};

export default ProjectDetail;
