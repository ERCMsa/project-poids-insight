import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAllPoids } from "@/hooks/usePoidsData";
import { Source, SOURCE_COLORS, SOURCE_LABELS } from "@/lib/api";
import { sumPoids, formatPoids } from "@/lib/poids-utils";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Search, FolderKanban, ChevronRight } from "lucide-react";

type ProjectRow = {
  project: string;
  fabrication: number;
  sortie: number;
  montage: number;
};

const Projects = () => {
  const { data, isLoading, error } = useAllPoids();
  const [query, setQuery] = useState("");

  const rows = useMemo<ProjectRow[]>(() => {
    if (!data) return [];
    const map = new Map<string, ProjectRow>();
    const accumulate = (source: Source) => {
      for (const e of data[source]) {
        const r = map.get(e.project) ?? {
          project: e.project,
          fabrication: 0,
          sortie: 0,
          montage: 0,
        };
        r[source] += e.totalPoids || 0;
        map.set(e.project, r);
      }
    };
    (["fabrication", "sortie", "montage"] as Source[]).forEach(accumulate);
    // Sort by the largest single-stage value (no cross-stage summing — stages are pipeline steps)
    return Array.from(map.values()).sort(
      (a, b) =>
        Math.max(b.fabrication, b.sortie, b.montage) -
        Math.max(a.fabrication, a.sortie, a.montage),
    );
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.project.toLowerCase().includes(q));
  }, [rows, query]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Loading projects...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-destructive">
        <AlertCircle className="h-8 w-8 mb-3" />
        <p className="text-sm">Failed to load data.</p>
      </div>
    );
  }

  const sources: Source[] = ["fabrication", "sortie", "montage"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} projects · click one to see its full statistics
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search project..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => {
          const max = Math.max(r.fabrication, r.sortie, r.montage, 1);
          return (
            <Link
              key={r.project}
              to={`/projects/${encodeURIComponent(r.project)}`}
              className="group rounded-2xl border border-border/60 gradient-card p-5 shadow-card hover:shadow-card-lg transition-base animate-fade-in"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-secondary grid place-items-center shrink-0">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{r.project}</p>
                    <p className="text-xs text-muted-foreground">3 pipeline steps</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>

              <div className="space-y-2">
                {sources.map((s) => {
                  const v = r[s];
                  const pct = (v / max) * 100;
                  return (
                    <div key={s}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{SOURCE_LABELS[s]}</span>
                        <span className="font-medium tabular-nums">{formatPoids(v)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: SOURCE_COLORS[s] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-sm text-muted-foreground py-12">
            No projects match "{query}"
          </p>
        )}
      </div>
    </div>
  );
};

export default Projects;
