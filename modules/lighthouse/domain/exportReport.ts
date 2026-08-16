/**
 * Investor-grade Lighthouse PDF, generated only from API JSON (GET /api/lighthouse/me).
 * No DOM / screen capture. Charts rendered in-memory (canvas → JPEG).
 */
import type { jsPDF } from "jspdf";
import type { LighthouseScoreResult } from "@/modules/lighthouse/domain/scoring";
import type { LighthouseAssessmentApi, LighthousePillarReport } from "@/modules/lighthouse/api/lighthouseApi";
import { fetchLighthouseReportForExport } from "@/modules/lighthouse/api/lighthouseApi";
import { formatLighthouseTakenAt } from "@/modules/lighthouse/domain/reportCache";

const LOGO_PATH = "/logoC.png";
const MARGIN = 18;
const FOOTER_H = 12;
const LINE_H = 5;
const MAX_TEXT_LEN = 8000;
const REPORT_VERSION = "1.0";

/** ESG Saathi brand + pillar palette (per design brief) */
const C = {
  primary: { rgb: [211, 47, 47] as const, hex: "#D32F2F" },
  green: { rgb: [0, 121, 107] as const, hex: "#00796B" },
  blue: { rgb: [25, 118, 210] as const, hex: "#1976D2" },
  black: { rgb: [33, 33, 33] as const, hex: "#212121" },
  orange: { rgb: [234, 88, 12] as const, hex: "#EA580C" },
  amber: { rgb: [245, 124, 0] as const, hex: "#F57C00" },
  success: { rgb: [46, 125, 50] as const, hex: "#2E7D32" },
  body: { rgb: [33, 33, 33] as const, hex: "#212121" },
  muted: { rgb: [97, 97, 97] as const, hex: "#616161" },
  white: { rgb: [255, 255, 255] as const, hex: "#FFFFFF" },
  surface: { rgb: [250, 250, 250] as const, hex: "#FAFAFA" },
  border: { rgb: [224, 224, 224] as const, hex: "#E0E0E0" },
};

type Rgb = readonly [number, number, number];

let logoDataUrlCache: string | null = null;
/** width / height from natural image pixels */
let logoAspectRatio = 1.35;

function rgb(doc: jsPDF, method: "setFillColor" | "setDrawColor" | "setTextColor", c: Rgb) {
  doc[method](c[0], c[1], c[2]);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function reportFilename(report: LighthouseAssessmentApi, ext: string) {
  const d = new Date(report.createdAt);
  const stamp = Number.isNaN(d.getTime()) ? "report" : d.toISOString().slice(0, 10);
  return `ESGSaathi-Lighthouse-${stamp}-${report.id.slice(0, 8)}.${ext}`;
}

function plainText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.slice(0, MAX_TEXT_LEN);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function pillarRgb(pillar: string): Rgb {
  if (pillar === "E") return C.green.rgb;
  if (pillar === "S") return C.blue.rgb;
  return C.orange.rgb;
}

function scoreTextRgb(score: number): Rgb {
  if (score >= 80) return C.green.rgb;
  if (score >= 60) return C.amber.rgb;
  return C.primary.rgb;
}

function priorityRgb(priority?: string): Rgb {
  const p = (priority ?? "").toLowerCase();
  if (p === "high") return C.primary.rgb;
  if (p === "medium") return C.muted.rgb;
  return C.blue.rgb;
}

function wrapLines(doc: jsPDF, text: string, maxW: number, fontSize: number): string[] {
  const t = plainText(text).replace(/\s+/g, " ").trim();
  if (!t) return [];
  doc.setFontSize(fontSize);
  const out: string[] = [];
  let line = "";
  for (const word of t.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (doc.getTextWidth(next) <= maxW) line = next;
    else {
      if (line) out.push(line);
      line = doc.getTextWidth(word) > maxW ? word.slice(0, 48) : word;
    }
  }
  if (line) out.push(line);
  return out;
}

async function loadLogoDataUrl(): Promise<string | null> {
  if (logoDataUrlCache) return logoDataUrlCache;
  try {
    const res = await fetch(`${window.location.origin}${LOGO_PATH}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    logoDataUrlCache = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const natW = img.naturalWidth || 1;
        const natH = img.naturalHeight || 1;
        logoAspectRatio = natW / natH;
        const maxW = 320;
        const s = Math.min(1, maxW / natW);
        const w = Math.max(1, Math.round(natW * s));
        const h = Math.max(1, Math.round(natH * s));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
    return logoDataUrlCache;
  } catch {
    return null;
  }
}

function coverLogoDimensionsMm(): { w: number; h: number } {
  const maxW = 54;
  const maxH = 30;
  let w = maxW;
  let h = w / logoAspectRatio;
  if (h > maxH) {
    h = maxH;
    w = h * logoAspectRatio;
  }
  return { w, h };
}

async function fetchMsmeCompanyName(): Promise<string> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  try {
    const res = await fetch(`${base}/api/profile/msme`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return "MSME Organisation";
    const data = (await res.json()) as { companyName?: string | null };
    return data.companyName?.trim() || "MSME Organisation";
  } catch {
    return "MSME Organisation";
  }
}

class PdfBuilder {
  doc: jsPDF;
  y: number;
  page = 1;
  logoUrl: string | null;
  readonly margin = MARGIN;
  readonly pageW: number;
  readonly pageH: number;
  readonly contentW: number;
  readonly bodyTop: number;
  readonly bodyBottom: number;

  constructor(doc: jsPDF, logoUrl: string | null) {
    this.doc = doc;
    this.logoUrl = logoUrl;
    this.pageW = doc.internal.pageSize.getWidth();
    this.pageH = doc.internal.pageSize.getHeight();
    this.contentW = this.pageW - this.margin * 2;
    this.bodyTop = this.margin;
    this.bodyBottom = this.pageH - this.margin - FOOTER_H;
    this.y = this.bodyTop;
  }

  safeImage(dataUrl: string, format: "JPEG" | "PNG", x: number, y: number, w: number, h: number) {
    if (!dataUrl) return;
    try {
      this.doc.addImage(dataUrl, format, x, y, w, h);
    } catch {
      /* skip */
    }
  }

  drawFooter() {
    const lineY = this.pageH - this.margin - 4;
    rgb(this.doc, "setDrawColor", C.border.rgb);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, lineY, this.pageW - this.margin, lineY);
    const fy = this.pageH - this.margin;
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    rgb(this.doc, "setTextColor", C.muted.rgb);
    this.doc.text("Confidential, MSME internal use", this.margin, fy);
    this.doc.text(`Page ${this.page}`, this.pageW - this.margin, fy, { align: "right" });
  }

  newPage() {
    this.doc.addPage();
    this.page += 1;
    this.y = this.bodyTop;
    this.drawFooter();
  }

  ensureSpace(h: number) {
    if (this.y + h <= this.bodyBottom) return;
    this.newPage();
  }

  gap(mm = 4) {
    this.y += mm;
  }

  centeredText(text: string, y: number, fontSize: number, style: "normal" | "bold" = "normal", color: Rgb = C.body.rgb) {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(fontSize);
    rgb(this.doc, "setTextColor", color);
    this.doc.text(text, this.pageW / 2, y, { align: "center" });
  }

  paragraph(text: string, opts?: { fontSize?: number; color?: Rgb; bold?: boolean; indent?: number }) {
    const t = plainText(text).trim();
    if (!t) return;
    const fs = opts?.fontSize ?? 10;
    const indent = opts?.indent ?? 0;
    const w = this.contentW - indent;
    const x = this.margin + indent;
    this.doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    for (const line of wrapLines(this.doc, t, w, fs)) {
      this.ensureSpace(LINE_H);
      rgb(this.doc, "setTextColor", opts?.color ?? C.body.rgb);
      this.doc.setFontSize(fs);
      this.doc.text(line, x, this.y);
      this.y += LINE_H;
    }
    this.y += 2;
  }

  numberedSection(num: number, title: string, ruleColor: Rgb = C.body.rgb) {
    this.ensureSpace(14);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(14);
    rgb(this.doc, "setTextColor", ruleColor);
    this.doc.text(`${num}. ${title}`, this.margin, this.y);
    this.y += 6;
    rgb(this.doc, "setDrawColor", ruleColor);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.y, this.pageW - this.margin, this.y);
    this.y += 8;
  }

  subTitle(text: string, color: Rgb = C.body.rgb) {
    this.ensureSpace(8);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    rgb(this.doc, "setTextColor", color);
    this.doc.text(text, this.margin, this.y);
    this.y += 7;
  }

  scoreRow(label: string, score: number, suffix: string, color: Rgb) {
    this.ensureSpace(8);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    rgb(this.doc, "setTextColor", C.body.rgb);
    this.doc.text(label, this.margin, this.y);
    this.doc.setFont("helvetica", "bold");
    rgb(this.doc, "setTextColor", color);
    this.doc.text(`${score.toFixed(1)}`, this.margin + 58, this.y);
    if (suffix) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(9);
      rgb(this.doc, "setTextColor", C.muted.rgb);
      this.doc.text(suffix, this.pageW - this.margin, this.y, { align: "right" });
    }
    this.y += 8;
  }

  progressBar(label: string, value: number, max: number, color: Rgb) {
    this.ensureSpace(9);
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    rgb(this.doc, "setTextColor", C.body.rgb);
    this.doc.text(label, this.margin, this.y + 3);
    this.doc.setFont("helvetica", "bold");
    rgb(this.doc, "setTextColor", color);
    this.doc.text(`${value.toFixed(1)} / ${max}`, this.margin + 52, this.y + 3);
    const bx = this.margin + 78;
    const bw = this.contentW - 78;
    rgb(this.doc, "setFillColor", C.border.rgb);
    this.doc.rect(bx, this.y + 1, bw, 4, "F");
    rgb(this.doc, "setFillColor", color);
    this.doc.rect(bx, this.y + 1, Math.max(1, (value / max) * bw), 4, "F");
    this.y += 9;
  }

  bulletLine(text: string, bulletColor: Rgb, prefix?: string) {
    this.ensureSpace(LINE_H + 1);
    rgb(this.doc, "setFillColor", bulletColor);
    this.doc.circle(this.margin + 2, this.y - 1.2, 1.2, "F");
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    rgb(this.doc, "setTextColor", C.body.rgb);
    const line = prefix ? `${prefix} ${text}` : text;
    for (const ln of wrapLines(this.doc, line, this.contentW - 8, 10)) {
      this.doc.text(ln, this.margin + 6, this.y);
      this.y += LINE_H;
    }
    this.y += 1;
  }
}

function addCoverPage(
  b: PdfBuilder,
  report: LighthouseAssessmentApi,
  scores: LighthouseScoreResult,
  companyName: string,
) {
  const { date, time } = formatLighthouseTakenAt(report.createdAt);
  const ref = `LH-${report.id.slice(0, 8).toUpperCase()}`;

  const { w: logoW, h: logoH } = coverLogoDimensionsMm();
  const logoY = 40;
  if (b.logoUrl) {
    b.safeImage(b.logoUrl, "JPEG", (b.pageW - logoW) / 2, logoY, logoW, logoH);
  }

  const titleY = logoY + logoH + 12;
  b.centeredText("Lighthouse ESG Self-Assessment Report", titleY, 17, "bold", C.body.rgb);

  let companyY = titleY + 9;
  const companyLines = wrapLines(b.doc, companyName, b.contentW - 16, 13);
  companyLines.forEach((ln) => {
    b.centeredText(ln, companyY, 13, "bold", C.primary.rgb);
    companyY += 5.5;
  });

  const lineY = companyY + 5;
  rgb(b.doc, "setDrawColor", C.border.rgb);
  b.doc.setLineWidth(0.35);
  b.doc.line(b.margin + 20, lineY, b.pageW - b.margin - 20, lineY);

  b.centeredText("ESG Saathi · MSME sustainability disclosure", lineY + 8, 10, "normal", C.muted.rgb);
  b.centeredText(`Assessment: ${date} at ${time}`, lineY + 16, 9, "normal", C.muted.rgb);
  b.centeredText(`Report ref: ${ref} · v${REPORT_VERSION}`, lineY + 23, 9, "normal", C.muted.rgb);

  const scoreY = lineY + 42;
  b.centeredText("AGGREGATE ESG SCORE", scoreY, 9, "bold", C.muted.rgb);
  b.centeredText(scores.totalScore.toFixed(1), scoreY + 14, 34, "bold", C.green.rgb);
  b.centeredText(`/ 100 · Readiness: ${scores.readiness}`, scoreY + 22, 11, "normal", C.body.rgb);

  const note =
    "This report summarises your Lighthouse self-assessment across Environmental, Social, and Governance pillars using the colour key on the following pages. Intended for internal management review and voluntary ESG disclosure planning, not a statutory audit or assurance opinion.";
  b.doc.setFont("helvetica", "normal");
  b.doc.setFontSize(9);
  rgb(b.doc, "setTextColor", C.muted.rgb);
  const noteLines = wrapLines(b.doc, note, b.contentW - 10, 9);
  let ny = scoreY + 38;
  noteLines.forEach((ln) => {
    b.doc.text(ln, b.pageW / 2, ny, { align: "center" });
    ny += 4.5;
  });

  b.drawFooter();
}

function addExecutiveSummary(
  b: PdfBuilder,
  report: LighthouseAssessmentApi,
  scores: LighthouseScoreResult,
) {
  b.newPage();
  b.numberedSection(1, "Executive Summary");

  b.scoreRow("Total ESG score", scores.totalScore, `/ 100 · ${scores.readiness}`, C.green.rgb);
  b.scoreRow("Environmental (E)", scores.pillarScores.E, `Weight ${(scores.weights.e * 100).toFixed(0)}%`, C.green.rgb);
  b.scoreRow("Social (S)", scores.pillarScores.S, `Weight ${(scores.weights.s * 100).toFixed(0)}%`, C.blue.rgb);
  b.scoreRow("Governance (G)", scores.pillarScores.G, `Weight ${(scores.weights.g * 100).toFixed(0)}%`, C.orange.rgb);
  b.gap(4);

  if (report.esgStrength?.overallSummary || report.esgStrength?.strengths?.length) {
    b.subTitle("Overall Strengths", C.green.rgb);
    if (report.esgStrength?.overallSummary) b.paragraph(report.esgStrength.overallSummary);
    report.esgStrength?.strengths?.forEach((item) => {
      if (typeof item === "string") b.bulletLine(item, C.green.rgb);
      else {
        const line = [item.title, item.detail].filter(Boolean).join(", ");
        b.bulletLine(item.pillar ? `${line} (${item.pillar})` : line, C.green.rgb);
      }
    });
    b.gap(3);
  }

  if (report.esgScopeOfImprovement?.overallSummary || report.esgScopeOfImprovement?.improvements?.length) {
    b.subTitle("Priority Improvement Themes", C.primary.rgb);
    if (report.esgScopeOfImprovement?.overallSummary) {
      b.paragraph(report.esgScopeOfImprovement.overallSummary);
    }
    report.esgScopeOfImprovement?.improvements?.forEach((item) => {
      const pri = item.priority ? `[${item.priority.toUpperCase()}] ` : "";
      const line = `${pri}${item.title ?? "Item"}${item.detail ? `, ${item.detail}` : ""}`;
      b.bulletLine(item.pillar ? `${line} (${item.pillar})` : line, priorityRgb(item.priority));
    });
  }
}

function addPerformanceAndKpi(b: PdfBuilder, scores: LighthouseScoreResult) {
  b.newPage();
  b.numberedSection(2, "Performance Dashboard");

  b.progressBar("Environmental (E)", scores.pillarScores.E, 100, C.green.rgb);
  b.progressBar("Social (S)", scores.pillarScores.S, 100, C.blue.rgb);
  b.progressBar("Governance (G)", scores.pillarScores.G, 100, C.orange.rgb);
  b.gap(6);

  b.numberedSection(3, "KPI Scorecard", C.body.rgb);
  b.paragraph("Full indicator-level results. Scores are on a 0–100 scale per KPI.", {
    fontSize: 9,
    color: C.muted.rgb,
  });
  b.gap(2);

  const cols = [b.margin, b.margin + 12, b.margin + 82, b.margin + 96, b.margin + 112, b.margin + 132];
  const rowH = 7;

  b.ensureSpace(rowH + 2);
  rgb(b.doc, "setDrawColor", C.border.rgb);
  b.doc.setLineWidth(0.3);
  b.doc.line(b.margin, b.y, b.pageW - b.margin, b.y);
  b.y += 5;
  b.doc.setFont("helvetica", "bold");
  b.doc.setFontSize(8);
  rgb(b.doc, "setTextColor", C.body.rgb);
  ["ID", "Indicator", "Pillar", "Q1", "Q2", "Score"].forEach((h, i) => b.doc.text(h, cols[i], b.y));
  b.y += rowH;

  scores.kpiScores.forEach((k, idx) => {
    b.ensureSpace(rowH + 1);
    if (idx % 2 === 0) {
      b.doc.setFillColor(248, 248, 248);
      b.doc.rect(b.margin, b.y - 4, b.contentW, rowH + 1, "F");
    }
    b.doc.setFont("helvetica", "normal");
    b.doc.setFontSize(8);
    rgb(b.doc, "setTextColor", C.body.rgb);
    b.doc.text(k.kpiId, cols[0], b.y);
    b.doc.text(k.kpiLabel.slice(0, 40), cols[1], b.y);
    rgb(b.doc, "setTextColor", pillarRgb(k.pillar));
    b.doc.setFont("helvetica", "bold");
    b.doc.text(k.pillar, cols[2], b.y);
    b.doc.setFont("helvetica", "normal");
    rgb(b.doc, "setTextColor", C.body.rgb);
    b.doc.text(String(k.q1), cols[3], b.y);
    b.doc.text(String(k.q2), cols[4], b.y);
    rgb(b.doc, "setTextColor", scoreTextRgb(k.score));
    b.doc.setFont("helvetica", "bold");
    b.doc.text(k.score.toFixed(1), cols[5], b.y);
    b.y += rowH + 1;
  });
}

function addStrengthsAndActions(b: PdfBuilder, report: LighthouseAssessmentApi) {
  b.newPage();
  b.numberedSection(4, "Strengths & Improvement Actions");

  if (report.esgStrength?.strengths?.length) {
    b.subTitle("Documented Strengths", C.green.rgb);
    report.esgStrength.strengths.forEach((item) => {
      if (typeof item === "string") {
        b.bulletLine(item, C.green.rgb);
        return;
      }
      const head = [item.title, item.pillar ? `(${item.pillar})` : ""].filter(Boolean).join(" ");
      b.doc.setFont("helvetica", "bold");
      b.doc.setFontSize(10);
      rgb(b.doc, "setTextColor", pillarRgb(item.pillar ?? "E"));
      b.ensureSpace(LINE_H + 1);
      b.doc.text(head.slice(0, 90), b.margin + 6, b.y);
      b.y += LINE_H;
      if (item.detail) b.paragraph(item.detail, { fontSize: 9, indent: 6 });
    });
    b.gap(4);
  }

  if (report.esgScopeOfImprovement?.improvements?.length) {
    b.subTitle("Recommended Actions (Prioritised)", C.primary.rgb);
    report.esgScopeOfImprovement.improvements.forEach((item) => {
      const pri = item.priority ? `[${item.priority.toUpperCase()}] ` : "";
      b.doc.setFont("helvetica", "bold");
      b.doc.setFontSize(10);
      rgb(b.doc, "setTextColor", priorityRgb(item.priority));
      b.ensureSpace(LINE_H + 1);
      b.doc.text(`${pri}${item.title ?? "Action"}`, b.margin, b.y);
      b.y += LINE_H;
      if (item.detail) b.paragraph(item.detail, { fontSize: 9, indent: 4, color: C.muted.rgb });
      b.gap(2);
    });
  }
}

function addPillarPage(
  b: PdfBuilder,
  sectionNum: number,
  title: string,
  accent: Rgb,
  data?: LighthousePillarReport,
) {
  if (!data?.summary && !data?.kpiBreakdown?.length && !data?.strengths?.length && !data?.improvements?.length) {
    return;
  }

  b.newPage();
  b.numberedSection(sectionNum, `${title} Pillar`, accent);

  const score = data.pillarScore ?? null;
  if (score != null) {
    b.ensureSpace(8);
    b.doc.setFont("helvetica", "bold");
    b.doc.setFontSize(10);
    rgb(b.doc, "setTextColor", accent);
    b.doc.text(`Pillar score ${score.toFixed(1)} / 100`, b.margin, b.y);
    if (data.weight != null) {
      b.doc.setFont("helvetica", "normal");
      rgb(b.doc, "setTextColor", C.muted.rgb);
      b.doc.text(`Weight in composite ${(Number(data.weight) * 100).toFixed(0)}%`, b.pageW - b.margin, b.y, {
        align: "right",
      });
    }
    b.y += 8;
  }

  if (data.summary) {
    b.subTitle("Pillar Summary", C.body.rgb);
    b.paragraph(data.summary);
    b.gap(2);
  }

  if (data.strengths?.length) {
    b.subTitle("Strengths", accent);
    data.strengths.forEach((s) => b.bulletLine(s, accent));
    b.gap(2);
  }

  if (data.improvements?.length) {
    b.subTitle("Improvement Areas", C.primary.rgb);
    data.improvements.forEach((s) => {
      rgb(b.doc, "setFillColor", C.primary.rgb);
      b.doc.rect(b.margin + 1, b.y - 2.5, 2.5, 2.5, "F");
      b.paragraph(s, { indent: 6 });
    });
    b.gap(2);
  }

  if (data.kpiBreakdown?.length) {
    b.subTitle("KPI Commentary", C.body.rgb);
    data.kpiBreakdown.forEach((k) => {
      b.ensureSpace(14);
      b.doc.setFont("helvetica", "bold");
      b.doc.setFontSize(10);
      rgb(b.doc, "setTextColor", C.body.rgb);
      const label = `${k.kpiId ?? ""}, ${k.kpiLabel ?? ""}`.trim();
      b.doc.text(label.slice(0, 75), b.margin, b.y);
      if (k.score != null) {
        b.doc.setFont("helvetica", "normal");
        b.doc.setFontSize(9);
        rgb(b.doc, "setTextColor", scoreTextRgb(k.score));
        b.doc.text(`Score ${k.score.toFixed(1)}`, b.pageW - b.margin, b.y, { align: "right" });
      }
      b.y += 5;
      if (k.insight) b.paragraph(k.insight, { fontSize: 9, color: C.muted.rgb });
      b.gap(2);
    });
  }
}

function addClosingNote(b: PdfBuilder, report: LighthouseAssessmentApi) {
  const { date, time } = formatLighthouseTakenAt(report.createdAt);
  b.gap(6);
  b.paragraph(
    `Report generated ${date} at ${time}. Data sourced from ESG Saathi Lighthouse assessment (ID ${report.id}). Results reflect self-reported information and AI-assisted narrative, validate before external use.`,
    { fontSize: 8, color: C.muted.rgb },
  );
  b.paragraph(
    `© ${new Date().getFullYear()} ESG Saathi. Confidential, MSME internal use.`,
    { fontSize: 8, color: C.muted.rgb },
  );
}

async function buildPdf(report: LighthouseAssessmentApi, scores: LighthouseScoreResult) {
  const { jsPDF } = await import("jspdf");
  const [logoUrl, companyName] = await Promise.all([loadLogoDataUrl(), fetchMsmeCompanyName()]);

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setProperties({
    title: "ESG Saathi Lighthouse Report",
    subject: "Lighthouse ESG Self-Assessment",
    author: "ESG Saathi",
    keywords: "ESG, Lighthouse, MSME, BRSR, sustainability",
    creator: "ESG Saathi Platform",
  });

  const b = new PdfBuilder(doc, logoUrl);
  addCoverPage(b, report, scores, companyName);
  addExecutiveSummary(b, report, scores);
  addPerformanceAndKpi(b, scores);
  addStrengthsAndActions(b, report);
  addPillarPage(b, 5, "Environmental", C.green.rgb, report.env);
  addPillarPage(b, 6, "Social", C.blue.rgb, report.social);
  addPillarPage(b, 7, "Governance", C.orange.rgb, report.gov);
  addClosingNote(b, report);

  return doc;
}

/** PDF from API JSON only, refreshes assessment + company profile when args omitted. */
export async function downloadLighthouseReportPdf(
  report?: LighthouseAssessmentApi,
  scores?: LighthouseScoreResult,
) {
  const payload =
    report && scores
      ? { report, scores }
      : await fetchLighthouseReportForExport();
  const doc = await buildPdf(payload.report, payload.scores);
  const buffer = doc.output("arraybuffer");
  downloadBlob(new Blob([buffer], { type: "application/pdf" }), reportFilename(payload.report, "pdf"));
}

export async function downloadLighthouseReportXbrl(
  report?: LighthouseAssessmentApi,
  scores?: LighthouseScoreResult,
) {
  const payload =
    report && scores
      ? { report, scores }
      : await fetchLighthouseReportForExport();
  const { report: r, scores: s } = payload;
  const ctx = `ctx-${r.id}`;
  const unit = "u-pure";
  const { date, time } = formatLighthouseTakenAt(r.createdAt);

  const fact = (name: string, value: string | number, typed = false) => {
    const v = typeof value === "number" ? value.toFixed(1) : escapeXml(String(value));
    const attr = typed && typeof value === "number" ? ' xsi:type="xsd:decimal"' : "";
    return `    <esg:${name} contextRef="${ctx}" unitRef="${unit}"${attr}>${v}</esg:${name}>`;
  };

  const textFact = (name: string, value: string) =>
    `    <esg:${name} contextRef="${ctx}">${escapeXml(value)}</esg:${name}>`;

  const kpiFacts = s.kpiScores
    .map(
      (k) => `
    <esg:KpiScore contextRef="${ctx}" unitRef="${unit}" esg:kpiId="${escapeXml(k.kpiId)}" esg:pillar="${k.pillar}">${k.score.toFixed(1)}</esg:KpiScore>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<xbrl xmlns="http://www.w3.org/2003/instance" xmlns:esg="https://esgsaathi.in/xbrl/lighthouse/2024">
  <context id="${ctx}">
    <entity><identifier scheme="https://esgsaathi.in">lighthouse</identifier></entity>
    <period><instant>${escapeXml(new Date(r.createdAt).toISOString())}</instant></period>
  </context>
  <unit id="${unit}"><measure>esg:pure</measure></unit>
  ${textFact("ReportId", r.id)}
  ${textFact("ReportVersion", REPORT_VERSION)}
  ${textFact("AssessmentDate", date)}
  ${textFact("AssessmentTime", time)}
  ${fact("TotalEsgScore", s.totalScore, true)}
  ${textFact("ReadinessLevel", s.readiness)}
  ${fact("EnvironmentalPillarScore", s.pillarScores.E, true)}
  ${fact("SocialPillarScore", s.pillarScores.S, true)}
  ${fact("GovernancePillarScore", s.pillarScores.G, true)}
  ${textFact("StrengthsSummary", r.esgStrength?.overallSummary ?? "")}
  ${textFact("ImprovementsSummary", r.esgScopeOfImprovement?.overallSummary ?? "")}
  ${kpiFacts}
</xbrl>`;

  downloadBlob(new Blob([xml], { type: "application/xml;charset=utf-8" }), reportFilename(r, "xbrl"));
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
