import { PoidsEntry, Source } from "./api";
import { groupByDay } from "./poids-utils";

export type Status = "good" | "warning" | "critical";
export type Trend = "increasing" | "stable" | "decreasing";

export type ProjectAnalysis = {
  project: string;
  totals: Record<Source, number>;
  status: Status;
  weakStage: Source | null;
  issues: string[];
  trend: Trend;
  trendPct: number; // % change last half vs first half
};

function sumByProject(entries: PoidsEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) m.set(e.project, (m.get(e.project) || 0) + (e.totalPoids || 0));
  return m;
}

function computeTrend(entries: PoidsEntry[]): { trend: Trend; pct: number } {
  const daily = groupByDay(entries);
  if (daily.length < 2) return { trend: "stable", pct: 0 };
  const mid = Math.floor(daily.length / 2);
  const first = daily.slice(0, mid).reduce((a, b) => a + b.total, 0) / Math.max(mid, 1);
  const last = daily.slice(mid).reduce((a, b) => a + b.total, 0) / Math.max(daily.length - mid, 1);
  if (first === 0) return { trend: last > 0 ? "increasing" : "stable", pct: 0 };
  const pct = ((last - first) / first) * 100;
  if (pct > 10) return { trend: "increasing", pct };
  if (pct < -10) return { trend: "decreasing", pct };
  return { trend: "stable", pct };
}

function detectIrregularity(entries: PoidsEntry[]): boolean {
  const daily = groupByDay(entries).map((d) => d.total);
  if (daily.length < 4) return false;
  const mean = daily.reduce((a, b) => a + b, 0) / daily.length;
  if (mean === 0) return false;
  const variance = daily.reduce((a, b) => a + (b - mean) ** 2, 0) / daily.length;
  const std = Math.sqrt(variance);
  // Coefficient of variation > 0.8 → irregular
  return std / mean > 0.8;
}

export function analyzeProjects(data: Record<Source, PoidsEntry[]>): ProjectAnalysis[] {
  const fab = sumByProject(data.fabrication);
  const sor = sumByProject(data.sortie);
  const mon = sumByProject(data.montage);

  const projects = new Set<string>([...fab.keys(), ...sor.keys(), ...mon.keys()]);
  const results: ProjectAnalysis[] = [];

  for (const project of projects) {
    const totals: Record<Source, number> = {
      fabrication: fab.get(project) || 0,
      sortie: sor.get(project) || 0,
      montage: mon.get(project) || 0,
    };

    const issues: string[] = [];
    let weakStage: Source | null = null;

    // Bottleneck: Fabrication >> Sortie
    if (totals.fabrication > 0 && totals.sortie < totals.fabrication * 0.5) {
      issues.push(
        `Sortie low (${Math.round((totals.sortie / totals.fabrication) * 100)}% of Fabrication)`
      );
      weakStage = "sortie";
    }

    // Bottleneck: Sortie >> Montage
    if (totals.sortie > 0 && totals.montage < totals.sortie * 0.5) {
      issues.push(
        `Montage delay (${Math.round((totals.montage / totals.sortie) * 100)}% of Sortie)`
      );
      if (!weakStage) weakStage = "montage";
    }

    // Missing fabrication
    if (totals.fabrication === 0 && (totals.sortie > 0 || totals.montage > 0)) {
      issues.push("No Fabrication data recorded");
      weakStage = "fabrication";
    }

    // Combine all entries for trend & irregularity
    const allEntries = [
      ...data.fabrication.filter((e) => e.project === project),
      ...data.sortie.filter((e) => e.project === project),
      ...data.montage.filter((e) => e.project === project),
    ];

    const { trend, pct } = computeTrend(allEntries);
    if (trend === "decreasing") {
      issues.push(`Production drop ${pct.toFixed(0)}% recently`);
    }

    if (detectIrregularity(allEntries)) {
      issues.push("Irregular daily output (spikes/gaps)");
    }

    let status: Status = "good";
    if (issues.length === 1) status = "warning";
    else if (issues.length >= 2) status = "critical";

    results.push({
      project,
      totals,
      status,
      weakStage,
      issues,
      trend,
      trendPct: pct,
    });
  }

  // Sort: critical first, then warning, then good
  const order: Record<Status, number> = { critical: 0, warning: 1, good: 2 };
  return results.sort((a, b) => order[a.status] - order[b.status]);
}
