import { useMemo, useState } from "react";
import { useAllPoids } from "@/hooks/usePoidsData";
import { analyzeProjects, ProjectAnalysis, Status } from "@/lib/ai-analysis";
import { SOURCE_LABELS, Source } from "@/lib/api";
import { formatPoids } from "@/lib/poids-utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  Status,
  { label: string; icon: typeof CheckCircle2; bg: string; text: string; border: string; dot: string }
> = {
  good: {
    label: "Good",
    icon: CheckCircle2,
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    dot: "bg-success",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
    dot: "bg-warning",
  },
  critical: {
    label: "Critical",
    icon: XCircle,
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    dot: "bg-destructive",
  },
};

const trendConfig = {
  increasing: { label: "Increasing", icon: TrendingUp, color: "text-success" },
  stable: { label: "Stable", icon: Minus, color: "text-muted-foreground" },
  decreasing: { label: "Decreasing", icon: TrendingDown, color: "text-destructive" },
};

const ProjectCard = ({ p }: { p: ProjectAnalysis }) => {
  const cfg = statusConfig[p.status];
  const StatusIcon = cfg.icon;
  const TrendIcon = trendConfig[p.trend].icon;
  const sources: Source[] = ["fabrication", "sortie", "montage"];

  return (
    <div
      className={cn(
        "rounded-2xl border-2 gradient-card p-5 shadow-card hover:shadow-card-lg transition-base animate-fade-in space-y-4",
        cfg.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold tracking-tight truncate">{p.project}</h3>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
              cfg.bg,
              cfg.text
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {cfg.label}
          </div>
        </div>
        <div className={cn("flex items-center gap-1 text-xs font-medium", trendConfig[p.trend].color)}>
          <TrendIcon className="h-3.5 w-3.5" />
          {trendConfig[p.trend].label}
          {p.trend !== "stable" && (
            <span className="text-muted-foreground">({p.trendPct >= 0 ? "+" : ""}{p.trendPct.toFixed(0)}%)</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {sources.map((s) => (
          <div
            key={s}
            className={cn(
              "rounded-lg p-2 border",
              p.weakStage === s ? "border-destructive/40 bg-destructive/5" : "border-border/40 bg-secondary/40"
            )}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {SOURCE_LABELS[s]}
            </p>
            <p className="text-sm font-semibold tabular-nums mt-0.5">
              {formatPoids(p.totals[s])}
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">kg</span>
            </p>
          </div>
        ))}
      </div>

      {p.weakStage && (
        <p className="text-xs">
          <span className="text-muted-foreground">Weak stage: </span>
          <span className="font-semibold text-destructive">{SOURCE_LABELS[p.weakStage]}</span>
        </p>
      )}

      {p.issues.length > 0 ? (
        <ul className="space-y-1">
          {p.issues.map((iss, i) => (
            <li key={i} className="text-xs flex items-start gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", cfg.dot)} />
              <span className="text-muted-foreground">{iss}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-success flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          No issues detected
        </p>
      )}
    </div>
  );
};

const AIAnalysis = () => {
  const { data, isLoading, error } = useAllPoids();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");

  const analyses = useMemo(() => (data ? analyzeProjects(data) : []), [data]);

  const filtered = useMemo(() => {
    return analyses.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (search && !a.project.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [analyses, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: analyses.length,
      good: analyses.filter((a) => a.status === "good").length,
      warning: analyses.filter((a) => a.status === "warning").length,
      critical: analyses.filter((a) => a.status === "critical").length,
    };
  }, [analyses]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Analyzing projects...</p>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            AI Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatic diagnosis of project performance across Fabrication, Sortie & Montage
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/60 gradient-card p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Projects</p>
          <p className="text-2xl font-bold mt-1">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider text-success">Good</p>
          <p className="text-2xl font-bold mt-1 text-success">{counts.good}</p>
        </div>
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider text-warning">Warning</p>
          <p className="text-2xl font-bold mt-1 text-warning">{counts.warning}</p>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 shadow-card">
          <p className="text-xs uppercase tracking-wider text-destructive">Critical</p>
          <p className="text-2xl font-bold mt-1 text-destructive">{counts.critical}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search project..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="critical">Critical only</SelectItem>
            <SelectItem value="warning">Warning only</SelectItem>
            <SelectItem value="good">Good only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">No projects match your filters.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.project} p={p} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;
