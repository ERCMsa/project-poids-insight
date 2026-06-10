import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, FileDown, Users, Scale, CalendarDays } from "lucide-react";
import { formatPoids } from "@/lib/poids-utils";

type MontageRecord = {
  project: string;
  date: string;
  totalPoids: number;
  responsable?: string | null;
};

const PALETTE = [
  { ring: "ring-indigo-500/40", bg: "bg-indigo-500", text: "text-indigo-50", rgb: [99, 102, 241] as [number, number, number] },
  { ring: "ring-emerald-500/40", bg: "bg-emerald-500", text: "text-emerald-50", rgb: [16, 185, 129] as [number, number, number] },
  { ring: "ring-amber-500/40", bg: "bg-amber-500", text: "text-amber-50", rgb: [245, 158, 11] as [number, number, number] },
  { ring: "ring-rose-500/40", bg: "bg-rose-500", text: "text-rose-50", rgb: [244, 63, 94] as [number, number, number] },
  { ring: "ring-sky-500/40", bg: "bg-sky-500", text: "text-sky-50", rgb: [14, 165, 233] as [number, number, number] },
  { ring: "ring-violet-500/40", bg: "bg-violet-500", text: "text-violet-50", rgb: [139, 92, 246] as [number, number, number] },
  { ring: "ring-teal-500/40", bg: "bg-teal-500", text: "text-teal-50", rgb: [20, 184, 166] as [number, number, number] },
  { ring: "ring-fuchsia-500/40", bg: "bg-fuchsia-500", text: "text-fuchsia-50", rgb: [217, 70, 239] as [number, number, number] },
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

async function fetchMontage(): Promise<MontageRecord[]> {
  const res = await fetch("https://api.ercmsalhi.com/api/out/poidsDaily/montage");
  if (!res.ok) throw new Error("Failed to fetch montage data");
  return res.json();
}

function generatePDF(responsable: string, records: MontageRecord[], color: [number, number, number]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const today = new Date();
  const todayStr = today.toDateString();

  const total = records.reduce((a, r) => a + (r.totalPoids || 0), 0);
  const todayTotal = records
    .filter((r) => new Date(r.date).toDateString() === todayStr)
    .reduce((a, r) => a + (r.totalPoids || 0), 0);

  // Header
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ERCMSA — Rapport de Montage", margin, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Généré le ${format(today, "dd/MM/yyyy HH:mm")}`, margin, 22);

  doc.setTextColor(0);
  let y = 42;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Responsable : ${responsable}`, margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Total poids cumulé : ${formatPoids(total)} kg`, margin, y);
  y += 5;
  doc.text(`Poids monté aujourd'hui : ${formatPoids(todayTotal)} kg`, margin, y);
  y += 5;
  doc.text(`Nombre d'entrées : ${records.length}`, margin, y);
  y += 8;

  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  autoTable(doc, {
    startY: y,
    head: [["Date", "Projet", "Poids (kg)"]],
    body: sorted.map((r) => [
      format(new Date(r.date), "dd/MM/yyyy"),
      r.project,
      formatPoids(r.totalPoids),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: color, textColor: 255 },
    theme: "striped",
    margin: { left: margin, right: margin },
  });

  const pages = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("ERCMSA SALHI ADEL — Charpente Métallique", margin, pageH - 6);
    doc.text(`Page ${i} / ${pages}`, pageW - margin, pageH - 6, { align: "right" });
  }

  const safe = responsable.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`Rapport_${safe}_${format(today, "yyyyMMdd")}.pdf`);
}

export default function Equipe() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["montage-equipe"],
    queryFn: fetchMontage,
    refetchInterval: 60_000,
  });

  const { groups, totalAll, todayAll } = useMemo(() => {
    const valid = (data ?? []).filter(
      (r) => r.responsable && String(r.responsable).trim().length > 0
    );
    const todayStr = new Date().toDateString();
    const map = new Map<string, MontageRecord[]>();
    for (const r of valid) {
      const key = String(r.responsable).trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const groups = Array.from(map.entries())
      .map(([responsable, records]) => {
        const total = records.reduce((a, r) => a + (r.totalPoids || 0), 0);
        const today = records
          .filter((r) => new Date(r.date).toDateString() === todayStr)
          .reduce((a, r) => a + (r.totalPoids || 0), 0);
        return { responsable, records, total, today };
      })
      .sort((a, b) => b.total - a.total);
    const totalAll = groups.reduce((a, g) => a + g.total, 0);
    const todayAll = groups.reduce((a, g) => a + g.today, 0);
    return { groups, totalAll, todayAll };
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-destructive">
        Erreur de chargement des données équipe.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Équipe Montage</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Suivi des responsables et de leur production de montage
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Responsables</div>
              <div className="text-2xl font-bold">{groups.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-indigo-500/10 text-indigo-500 grid place-items-center">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Total poids monté</div>
              <div className="text-2xl font-bold">{formatPoids(totalAll)} kg</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-emerald-500/10 text-emerald-500 grid place-items-center">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Aujourd'hui</div>
              <div className="text-2xl font-bold">{formatPoids(todayAll)} kg</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {groups.map(({ responsable, records, total, today }) => {
          const c = colorFor(responsable);
          const sorted = [...records].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          return (
            <Card key={responsable} className={`ring-1 ${c.ring}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base font-bold uppercase leading-tight">
                    {responsable}
                  </CardTitle>
                  <Badge className={`${c.bg} ${c.text} hover:opacity-90 shrink-0`}>
                    {formatPoids(total)} kg
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={
                    today > 0
                      ? "rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5"
                      : "rounded-lg bg-muted/50 border border-border px-3 py-2.5"
                  }
                >
                  {today > 0 ? (
                    <>
                      <div className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-medium">
                        Poids monté aujourd'hui
                      </div>
                      <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                        {formatPoids(today)} kg
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Aucune activité aujourd'hui
                    </div>
                  )}
                </div>

                <div className="rounded-lg border max-h-64 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="h-9">Date</TableHead>
                        <TableHead className="h-9">Projet</TableHead>
                        <TableHead className="h-9 text-right">Poids (kg)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sorted.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-2 whitespace-nowrap">
                            {format(new Date(r.date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="py-2 text-xs">{r.project}</TableCell>
                          <TableCell className="py-2 text-right font-medium">
                            {formatPoids(r.totalPoids)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Button
                  className="w-full"
                  onClick={() => generatePDF(responsable, records, c.rgb)}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Générer Rapport PDF
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
