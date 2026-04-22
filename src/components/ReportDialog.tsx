import { useMemo, useState } from "react";
import { format, startOfMonth, startOfWeek, startOfYear, subDays } from "date-fns";
import { CalendarIcon, FileText, Loader2 } from "lucide-react";
import { PoidsEntry, Source } from "@/lib/api";
import { generateStatisticsPDF } from "@/lib/pdf-report";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Preset = "day" | "week" | "month" | "year" | "custom";

type Props = {
  data?: Record<Source, PoidsEntry[]>;
};

export const ReportDialog = ({ data }: Props) => {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [to, setTo] = useState<Date | undefined>(new Date());
  const [project, setProject] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  const projects = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    [...data.fabrication, ...data.sortie, ...data.montage].forEach((e) => set.add(e.project));
    return Array.from(set).sort();
  }, [data]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const now = new Date();
    if (p === "day") {
      setFrom(subDays(now, 0));
      setTo(now);
    } else if (p === "week") {
      setFrom(startOfWeek(now, { weekStartsOn: 1 }));
      setTo(now);
    } else if (p === "month") {
      setFrom(startOfMonth(now));
      setTo(now);
    } else if (p === "year") {
      setFrom(startOfYear(now));
      setTo(now);
    }
  };

  const handleGenerate = async () => {
    if (!data) return;
    setBusy(true);
    try {
      const rangeLabel =
        from && to
          ? `${format(from, "dd MMM yyyy")} → ${format(to, "dd MMM yyyy")} (${preset})`
          : "All time";
      generateStatisticsPDF({ data, from, to, project, rangeLabel });
      toast.success("PDF report generated");
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <FileText className="h-3.5 w-3.5" /> PDF report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate statistics PDF</DialogTitle>
          <DialogDescription>
            Choose a date range and a project. The report keeps Fabrication, Sortie and Montage as
            separate steps.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Quick range</Label>
            <div className="grid grid-cols-5 gap-2">
              {(["day", "week", "month", "year", "custom"] as Preset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={cn(
                    "px-2 py-1.5 text-xs font-medium rounded-md border transition-base capitalize",
                    preset === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-accent"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1.5 block">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {from ? format(from, "dd MMM yyyy") : "Pick"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={from}
                    onSelect={(d) => {
                      setFrom(d);
                      setPreset("custom");
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {to ? format(to, "dd MMM yyyy") : "Pick"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={to}
                    onSelect={(d) => {
                      setTo(d);
                      setPreset("custom");
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Project</Label>
            <Select value={project} onValueChange={setProject}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!data || busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
