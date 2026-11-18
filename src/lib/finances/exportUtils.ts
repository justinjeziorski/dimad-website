import { exportRevenueWorkbook } from "@/lib/revenue/exportExcel";
import { money } from "@/lib/revenue/ledgerEngine";
import type { ChannelBreakdownRow, RecurringExpense, RevenueKpis } from "@/lib/revenue/types";
import type { ExecutiveBriefing, FinanceExportPayload } from "@/lib/finances/types";

const PDF_ROOT_ID = "finance-command-center";

function escapeCsv(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function assertClient() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Finance exports only run in the browser.");
  }
}

/** Download normalized ledger as CSV for accountants / tax filing. */
export function exportFinanceCsv(
  ledger: FinanceExportPayload["ledger"],
  filename = `dimad-finances-${new Date().toISOString().slice(0, 10)}.csv`
) {
  assertClient();
  const header = [
    "id",
    "date",
    "type",
    "source",
    "platform",
    "amount",
    "fee",
    "currency",
    "category",
    "recurring",
    "merchant",
    "notes"
  ];
  const lines = [header.join(",")];
  for (const row of ledger) {
    lines.push(
      [
        row.id,
        row.date,
        row.type,
        row.source,
        row.platformLabel,
        row.amount,
        row.feeAmount ?? 0,
        row.currency,
        row.category,
        row.isRecurring ? "yes" : "no",
        row.merchantOrCustomer ?? "",
        row.notes ?? ""
      ]
        .map(escapeCsv)
        .join(",")
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

/** Excel workbook via shared revenue exporter. */
export async function exportFinanceXlsx(opts: {
  kpis: RevenueKpis;
  channels: ChannelBreakdownRow[];
  recurring: RecurringExpense[];
  ledger: FinanceExportPayload["ledger"];
  chartSeries?: Array<Record<string, string | number>>;
  filename?: string;
}) {
  assertClient();
  await exportRevenueWorkbook({
    ...opts,
    filename: opts.filename || `dimad-finances-${new Date().toISOString().slice(0, 10)}.xlsx`
  });
}

export type FinancePdfOptions = {
  /** DOM id of the workspace wrapper to snapshot. Defaults to `#finance-command-center`. */
  rootId?: string;
  /** Optional filename override. */
  filename?: string;
  /** Kept for call-site compatibility; snapshot uses live DOM. */
  payload?: FinanceExportPayload;
};

/**
 * High-fidelity PDF of the live Finances Command Center.
 * Client-only: html2canvas captures charts/SVGs, jsPDF paginates the bitmap.
 */
export async function exportFinancePdf(opts: FinancePdfOptions | FinanceExportPayload = {}) {
  assertClient();

  const rootId =
    opts && "rootId" in opts && opts.rootId
      ? opts.rootId
      : PDF_ROOT_ID;
  const filename =
    opts && "filename" in opts && opts.filename
      ? opts.filename
      : `Dimad_Financial_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

  const target = document.getElementById(rootId);
  if (!target) {
    throw new Error(`PDF snapshot target #${rootId} was not found.`);
  }

  // Hide chrome that should not appear in the executive snapshot.
  const hide = target.querySelectorAll<HTMLElement>("[data-pdf-hide]");
  const prevVisibility: string[] = [];
  hide.forEach((el, i) => {
    prevVisibility[i] = el.style.visibility;
    el.style.visibility = "hidden";
  });

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf")
    ]);

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#0A192F",
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
      // Avoid clipping tall workspaces inside overflow:hidden parents.
      scrollX: 0,
      scrollY: -window.scrollY,
      onclone: (doc) => {
        const clone = doc.getElementById(rootId);
        if (!clone) return;
        clone.style.height = "auto";
        clone.style.maxHeight = "none";
        clone.style.overflow = "visible";
        // Force SVG text/fill to paint in the cloned tree.
        clone.querySelectorAll("svg").forEach((svg) => {
          (svg as SVGElement).setAttribute("xmlns", "http://www.w3.org/2000/svg");
        });
      }
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("PDF snapshot produced an empty canvas.");
    }

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Slice the tall snapshot across pages to avoid blank trailing pages.
    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= usableHeight;

    while (heightLeft > 2) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= usableHeight;
    }

    pdf.save(filename);
  } finally {
    hide.forEach((el, i) => {
      el.style.visibility = prevVisibility[i] ?? "";
    });
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type EmailDispatchPayload = {
  to: string;
  subject: string;
  periodLabel: string;
  kpis: FinanceExportPayload["kpis"];
  briefing: ExecutiveBriefing;
};

/** Secure client dispatch via mailto with structured snapshot body. */
export function buildFinanceMailto(payload: EmailDispatchPayload): string {
  const lines = [
    `DIMAD Finances snapshot — ${payload.periodLabel}`,
    "",
    `Gross Revenue: ${money(payload.kpis.grossRevenue)}`,
    `Net Profit: ${money(payload.kpis.netProfit)}`,
    `Margin: ${payload.kpis.marginPct.toFixed(1)}%`,
    `MRR: ${money(payload.kpis.mrr)}`,
    `Monthly Burn: ${money(payload.kpis.monthlyRecurringBurn)}`,
    "",
    payload.briefing.title + ":",
    ...payload.briefing.bullets.map((b, i) => `${i + 1}. ${b}`),
    "",
    "— Sent from DIMAD OS Finances Command Center"
  ];
  const subject = encodeURIComponent(payload.subject);
  const body = encodeURIComponent(lines.join("\n"));
  const to = encodeURIComponent(payload.to.trim());
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function dispatchFinanceEmail(payload: EmailDispatchPayload) {
  assertClient();
  const href = buildFinanceMailto(payload);
  window.location.href = href;
}
