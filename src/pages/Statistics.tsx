import { useState } from "react";
import { useAllPoids } from "@/hooks/usePoidsData";
import { Period } from "@/lib/poids-utils";
import { Source } from "@/lib/api";
import { PeriodFilter } from "@/components/PeriodFilter";
import { SourceStatsBlock } from "@/components/SourceStatsBlock";
import { ReportDialog } from "@/components/ReportDialog";
import { Loader2, AlertCircle } from "lucide-react";

const Statistics = () => {
  const { data, isLoading, error } = useAllPoids();
  const [period, setPeriod] = useState<Period>("year");

  const sources: Source[] = ["fabrication", "sortie", "montage"];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Loading analytics...</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each step shown side-by-side · generate a downloadable PDF report
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter value={period} onChange={setPeriod} />
          <ReportDialog data={data} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {sources.map((s) => (
          <SourceStatsBlock key={s} source={s} entries={data[s]} period={period} />
        ))}
      </div>
    </div>
  );
};

export default Statistics;
