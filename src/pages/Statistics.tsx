import { useMemo, useState } from "react";
import { useAllPoids } from "@/hooks/usePoidsData";
import { extractYears, filterBySelection } from "@/lib/poids-utils";
import { Source } from "@/lib/api";
import { DateSelector, DateSelection, formatSelectionLabel } from "@/components/DateSelector";
import { SourceStatsBlock } from "@/components/SourceStatsBlock";
import { ReportDialog } from "@/components/ReportDialog";
import { Loader2, AlertCircle } from "lucide-react";

const Statistics = () => {
  const { data, isLoading, error } = useAllPoids();
  const [selection, setSelection] = useState<DateSelection>({
    granularity: "year",
    year: new Date().getFullYear(),
  });

  const sources: Source[] = ["fabrication", "sortie", "montage"];

  const availableYears = useMemo(() => {
    if (!data) return [];
    return extractYears([...data.fabrication, ...data.sortie, ...data.montage]);
  }, [data]);

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Statistics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each step shown side-by-side · viewing{" "}
            <span className="font-medium text-foreground">{formatSelectionLabel(selection)}</span>
          </p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <DateSelector value={selection} onChange={setSelection} availableYears={availableYears} />
          <ReportDialog data={data} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {sources.map((s) => (
          <SourceStatsBlock
            key={s}
            source={s}
            entries={filterBySelection(data[s], selection)}
            label={formatSelectionLabel(selection)}
          />
        ))}
      </div>
    </div>
  );
};

export default Statistics;
