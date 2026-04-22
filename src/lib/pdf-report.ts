import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { PoidsEntry, Source, SOURCE_LABELS } from "./api";
import {
  filterByDateRange,
  formatPoids,
  groupByMonth,
  groupByProject,
  sumPoids,
} from "./poids-utils";

export type ReportOptions = {
  data: Record<Source, PoidsEntry[]>;
  from?: Date;
  to?: Date;
  project?: string; // "all" or specific project
  rangeLabel: string;
};

const SOURCES: Source[] = ["fabrication", "sortie", "montage"];
const SOURCE_RGB: Record<Source, [number, number, number]> = {
  fabrication: [99, 102, 241],
  sortie: [16, 185, 129],
  montage: [245, 158, 11],
};

function drawBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  labels: string[],
  values: number[],
  color: [number, number, number]
) {
  doc.setDrawColor(220);
  doc.setLineWidth(0.2);
  doc.rect(x, y, width, height);

  if (!values.length) {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("No data", x + width / 2, y + height / 2, { align: "center" });
    doc.setTextColor(0);
    return;
  }

  const max = Math.max(...values, 1);
  const padding = 6;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2 - 8;
  const barW = (innerW / values.length) * 0.7;
  const gap = (innerW / values.length) * 0.3;

  doc.setFillColor(...color);
  values.forEach((v, i) => {
    const h = (v / max) * innerH;
    const bx = x + padding + i * (barW + gap) + gap / 2;
    const by = y + padding + (innerH - h);
    doc.rect(bx, by, barW, h, "F");
  });

  // x-axis labels
  doc.setFontSize(7);
  doc.setTextColor(110);
  labels.forEach((l, i) => {
    const bx = x + padding + i * (barW + gap) + gap / 2 + barW / 2;
    doc.text(l, bx, y + height - 2, { align: "center" });
  });
  doc.setTextColor(0);
}

export function generateStatisticsPDF(opts: ReportOptions) {
  const { data, from, to, project, rangeLabel } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  const filterSet = (entries: PoidsEntry[]) => {
    let res = filterByDateRange(entries, from, to);
    if (project && project !== "all") res = res.filter((e) => e.project === project);
    return res;
  };

  // ===== Cover =====
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 50, "F");
  doc.setTextColor(255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Statistics Report", margin, 22);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Poids tracking · Fabrication · Sortie · Montage", margin, 31);
  doc.setFontSize(9);
  doc.text(`Generated ${format(new Date(), "dd MMM yyyy HH:mm")}`, margin, 40);
  doc.setTextColor(0);

  let y = 60;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Range:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(rangeLabel, margin + 18, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Project:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(project && project !== "all" ? project : "All projects", margin + 18, y);
  y += 10;

  // ===== Global KPI summary =====
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Summary by step", margin, y);
  y += 6;

  const cardW = (pageW - margin * 2 - 6) / 3;
  const cardH = 26;
  SOURCES.forEach((s, i) => {
    const total = sumPoids(filterSet(data[s]));
    const x = margin + i * (cardW + 3);
    const c = SOURCE_RGB[s];
    doc.setFillColor(c[0], c[1], c[2]);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "F");
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(SOURCE_LABELS[s].toUpperCase(), x + 4, y + 7);
    doc.setFontSize(15);
    doc.text(`${formatPoids(total)} kg`, x + 4, y + 18);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${filterSet(data[s]).length} entries`, x + 4, y + 23);
  });
  doc.setTextColor(0);
  y += cardH + 10;

  // ===== Per-source sections =====
  SOURCES.forEach((s) => {
    const entries = filterSet(data[s]);
    const total = sumPoids(entries);
    const monthly = groupByMonth(entries);
    const ranking = groupByProject(entries);

    // Estimate space; new page if needed
    if (y > 230) {
      doc.addPage();
      y = margin;
    }

    // Section header
    const c = SOURCE_RGB[s];
    doc.setFillColor(c[0], c[1], c[2]);
    doc.rect(margin, y, 3, 8, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(SOURCE_LABELS[s], margin + 6, y + 6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110);
    doc.text(`${formatPoids(total)} kg · ${entries.length} entries`, pageW - margin, y + 6, {
      align: "right",
    });
    doc.setTextColor(0);
    y += 12;

    // Bar chart of monthly
    const chartH = 50;
    drawBarChart(
      doc,
      margin,
      y,
      pageW - margin * 2,
      chartH,
      monthly.map((m) => m.date.slice(2)),
      monthly.map((m) => m.total),
      c
    );
    y += chartH + 6;

    // Top projects table
    if (ranking.length) {
      autoTable(doc, {
        startY: y,
        head: [["#", "Project", "Total (kg)", "Entries"]],
        body: ranking.slice(0, 10).map((p, i) => {
          const projEntries = entries.filter((e) => e.project === p.project);
          return [String(i + 1), p.project, formatPoids(p.total), String(projEntries.length)];
        }),
        styles: { fontSize: 8, cellPadding: 1.8 },
        headStyles: { fillColor: c, textColor: 255, fontSize: 8 },
        margin: { left: margin, right: margin },
        theme: "striped",
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
    }

    // Detailed entries (sorted by date desc)
    if (entries.length) {
      if (y > 240) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Detailed entries — ${SOURCE_LABELS[s]}`, margin, y);
      y += 3;
      const sorted = [...entries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      autoTable(doc, {
        startY: y + 2,
        head: [["Date", "Project", "Poids (kg)"]],
        body: sorted.map((e) => [
          format(new Date(e.date), "dd/MM/yyyy HH:mm"),
          e.project,
          formatPoids(e.totalPoids),
        ]),
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        headStyles: { fillColor: [40, 40, 40], textColor: 255, fontSize: 8 },
        margin: { left: margin, right: margin },
        theme: "grid",
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    }
  });

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} / ${pages}`,
      pageW - margin,
      doc.internal.pageSize.getHeight() - 6,
      { align: "right" }
    );
    doc.text("Poids Statistics Report", margin, doc.internal.pageSize.getHeight() - 6);
  }

  const fname = `statistics-report-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`;
  doc.save(fname);
}
