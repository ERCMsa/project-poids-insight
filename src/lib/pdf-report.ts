import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { PoidsEntry, Source, SOURCE_LABELS } from "./api";
import {
  filterByDateRange,
  groupByMonth,
  groupByProject,
  sumPoids,
} from "./poids-utils";

export type ReportOptions = {
  data: Record<Source, PoidsEntry[]>;
  from?: Date;
  to?: Date;
  project?: string;
  rangeLabel: string;
};

const SOURCES: Source[] = ["fabrication", "sortie", "montage"];

// Brand palette
const BRAND: [number, number, number] = [15, 23, 42]; // slate-900
const MUTED: [number, number, number] = [100, 116, 139]; // slate-500
const LIGHT: [number, number, number] = [241, 245, 249]; // slate-100
const BORDER: [number, number, number] = [226, 232, 240]; // slate-200

const SOURCE_RGB: Record<Source, [number, number, number]> = {
  fabrication: [79, 70, 229],   // indigo-600
  sortie: [5, 150, 105],        // emerald-600
  montage: [217, 119, 6],       // amber-600
};
const SOURCE_SOFT: Record<Source, [number, number, number]> = {
  fabrication: [238, 242, 255],
  sortie: [236, 253, 245],
  montage: [255, 251, 235],
};

// PDF-safe number formatting (avoid narrow-no-break-space which Helvetica can't render)
function fmtNum(n: number): string {
  const rounded = Math.round(n);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function drawBarChart(
  doc: jsPDF,
  x: number, y: number, width: number, height: number,
  labels: string[], values: number[],
  color: [number, number, number]
) {
  // background
  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 1.5, 1.5, "FD");

  if (!values.length) {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No data", x + width / 2, y + height / 2, { align: "center" });
    doc.setTextColor(0);
    return;
  }

  const max = Math.max(...values, 1);
  const padX = 8;
  const padTop = 6;
  const padBottom = 10;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const slot = innerW / values.length;
  const barW = slot * 0.6;

  // y-grid
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.1);
  for (let i = 1; i <= 3; i++) {
    const gy = y + padTop + (innerH * i) / 4;
    doc.line(x + padX, gy, x + width - padX, gy);
  }

  doc.setFillColor(...color);
  values.forEach((v, i) => {
    const h = (v / max) * innerH;
    const bx = x + padX + i * slot + (slot - barW) / 2;
    const by = y + padTop + (innerH - h);
    doc.roundedRect(bx, by, barW, Math.max(h, 0.4), 0.6, 0.6, "F");
  });

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  labels.forEach((l, i) => {
    const cx = x + padX + i * slot + slot / 2;
    doc.text(l, cx, y + height - 3, { align: "center" });
  });
  doc.setTextColor(0);
}

function header(doc: jsPDF, title: string, subtitle: string) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 44, "F");
  // accent bar
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 44, pageW, 1.5, "F");

  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, 14, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(subtitle, 14, 30);
  doc.setFontSize(8.5);
  doc.text(
    `Generated ${format(new Date(), "dd MMM yyyy · HH:mm")}`,
    pageW - 14, 30, { align: "right" }
  );
  doc.setTextColor(0);
}

function footer(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(14, pageH - 12, pageW - 14, pageH - 12);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Poids Statistics Report", 14, pageH - 6);
    doc.text(`Page ${i} / ${pages}`, pageW - 14, pageH - 6, { align: "right" });
  }
  doc.setTextColor(0);
}

export function generateStatisticsPDF(opts: ReportOptions) {
  const { data, from, to, project, rangeLabel } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  const filterSet = (entries: PoidsEntry[]) => {
    let res = filterByDateRange(entries, from, to);
    if (project && project !== "all") res = res.filter((e) => e.project === project);
    return res;
  };

  header(doc, "Statistics Report", "Fabrication · Sortie · Montage");

  // Meta info card
  let y = 56;
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, y, pageW - margin * 2, 18, 2, 2, "FD");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.text("RANGE", margin + 5, y + 7);
  doc.text("PROJECT", margin + (pageW - margin * 2) / 2, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(rangeLabel, margin + 5, y + 14);
  doc.text(
    project && project !== "all" ? project : "All projects",
    margin + (pageW - margin * 2) / 2, y + 14
  );
  y += 26;

  // KPI cards (per stage — never summed together)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Pipeline stages", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("Three sequential steps · shown side-by-side", margin, y + 4.5);
  y += 9;

  const gap = 4;
  const cardW = (pageW - margin * 2 - gap * 2) / 3;
  const cardH = 32;
  SOURCES.forEach((s, i) => {
    const entries = filterSet(data[s]);
    const total = sumPoids(entries);
    const x = margin + i * (cardW + gap);
    const c = SOURCE_RGB[s];
    const soft = SOURCE_SOFT[s];

    // card body
    doc.setFillColor(...soft);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, "FD");
    // left accent
    doc.setFillColor(...c);
    doc.roundedRect(x, y, 2, cardH, 1, 1, "F");

    doc.setTextColor(...c);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(SOURCE_LABELS[s].toUpperCase(), x + 6, y + 7);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(17);
    doc.text(`${fmtNum(total)}`, x + 6, y + 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text("kg", x + 6 + doc.getTextWidth(fmtNum(total)) + 2, y + 18);
    doc.text(`${entries.length} entries`, x + 6, y + 26);
  });
  doc.setTextColor(0);
  y += cardH + 10;

  // ===== Per-source sections =====
  SOURCES.forEach((s) => {
    const entries = filterSet(data[s]);
    const total = sumPoids(entries);
    const monthly = groupByMonth(entries);
    const ranking = groupByProject(entries);
    const c = SOURCE_RGB[s];

    if (y > pageH - 80) {
      doc.addPage();
      header(doc, "Statistics Report", "Fabrication · Sortie · Montage");
      y = 56;
    }

    // Section title bar
    doc.setFillColor(...c);
    doc.roundedRect(margin, y, pageW - margin * 2, 10, 1.5, 1.5, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(SOURCE_LABELS[s].toUpperCase(), margin + 4, y + 6.8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `${fmtNum(total)} kg  ·  ${entries.length} entries`,
      pageW - margin - 4, y + 6.8, { align: "right" }
    );
    doc.setTextColor(0);
    y += 14;

    // Chart
    const chartH = 48;
    drawBarChart(
      doc, margin, y, pageW - margin * 2, chartH,
      monthly.map((m) => m.date.slice(2)),
      monthly.map((m) => m.total),
      c
    );
    y += chartH + 6;

    if (ranking.length) {
      autoTable(doc, {
        startY: y,
        head: [["#", "Project", "Total (kg)", "Entries"]],
        body: ranking.slice(0, 10).map((p, i) => {
          const projEntries = entries.filter((e) => e.project === p.project);
          return [String(i + 1), p.project, fmtNum(p.total), String(projEntries.length)];
        }),
        styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
        headStyles: { fillColor: c, textColor: 255, fontSize: 8.5, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          2: { halign: "right", fontStyle: "bold" },
          3: { halign: "right" },
        },
        margin: { left: margin, right: margin },
        theme: "plain",
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }

    if (entries.length) {
      if (y > pageH - 50) {
        doc.addPage();
        header(doc, "Statistics Report", "Fabrication · Sortie · Montage");
        y = 56;
      }
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`Detailed entries — ${SOURCE_LABELS[s]}`, margin, y);
      const sorted = [...entries].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      autoTable(doc, {
        startY: y + 3,
        head: [["Date", "Project", "Poids (kg)"]],
        body: sorted.map((e) => [
          format(new Date(e.date), "dd/MM/yyyy HH:mm"),
          e.project,
          fmtNum(e.totalPoids),
        ]),
        styles: { fontSize: 8, cellPadding: 1.8, textColor: [51, 65, 85] },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 32 },
          2: { halign: "right", fontStyle: "bold", cellWidth: 28 },
        },
        margin: { left: margin, right: margin },
        theme: "plain",
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    }
  });

  footer(doc);
  doc.save(`statistics-report-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
}
