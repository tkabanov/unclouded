import { jsPDF } from "jspdf";
import { sanitizeSubDimensions } from "@/lib/reassessment/pdf/extractSubDimensions";
import type { PupPdfPayload } from "@/lib/reassessment/pdf/pupPdfTypes";
import { COACHING_DISCLAIMER } from "@/lib/reassessment/pdf/pupPdfTypes";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_RESERVE = 32;
const MAX_SCORE = 5;
const LINE_FACTOR = 1.25;
/** jsPDF fontSize is in points; page units are mm. */
const PT_TO_MM = 0.352778;

function fontSizeMm(fontSizePt: number): number {
  return fontSizePt * PT_TO_MM;
}

function textBlockHeight(lineCount: number, fontSizePt: number): number {
  return Math.max(0, lineCount) * fontSizeMm(fontSizePt) * LINE_FACTOR;
}

function firstBaseline(boxTop: number, pad: number, fontSizePt: number): number {
  return boxTop + pad + fontSizeMm(fontSizePt) * 0.9;
}

function splitLines(doc: jsPDF, text: string, width: number, fontSize: number): string[] {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, width) as string[];
}

function writeLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
): number {
  if (lines.length === 0) return y;
  doc.setFontSize(fontSize);
  doc.text(lines, x, y, { lineHeightFactor: LINE_FACTOR });
  return y + textBlockHeight(lines.length, fontSize);
}

const C = {
  primary: [32, 86, 115] as const,
  primarySoft: [224, 238, 245] as const,
  stability: [32, 86, 115] as const,
  performance: [46, 125, 96] as const,
  alignment: [176, 118, 48] as const,
  text: [24, 32, 40] as const,
  muted: [92, 102, 112] as const,
  border: [214, 220, 228] as const,
  card: [248, 250, 252] as const,
  callout: [240, 246, 250] as const,
  premium: [88, 64, 128] as const,
};

type RGB = readonly [number, number, number];

function setFill(doc: jsPDF, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDraw(doc: jsPDF, color: RGB) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: RGB) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function contentBottom(): number {
  return PAGE_HEIGHT - FOOTER_RESERVE;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed <= contentBottom()) return y;
  doc.addPage();
  drawRunningHeader(doc);
  return MARGIN + 12;
}

function drawRunningHeader(doc: jsPDF): void {
  setFill(doc, C.primary);
  doc.rect(0, 0, PAGE_WIDTH, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, C.muted);
  doc.text("Uncloud360 · PuP 360", MARGIN, 9);
  setDraw(doc, C.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 11, PAGE_WIDTH - MARGIN, 11);
}

function drawRoundedCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: RGB = C.card,
  radius = 2,
): void {
  setFill(doc, fill);
  setDraw(doc, C.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, radius, radius, "FD");
}

function drawCover(doc: jsPDF, payload: PupPdfPayload): number {
  const isPremium = payload.tier === "premium";
  setFill(doc, C.primary);
  doc.rect(0, 0, PAGE_WIDTH, 52, "F");

  setFill(doc, [48, 108, 138]);
  doc.rect(0, 48, PAGE_WIDTH, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setText(doc, [255, 255, 255]);
  doc.text(payload.platformName, MARGIN, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  setText(doc, [220, 235, 245]);
  doc.text(
    isPremium ? "PuP 360 Diagnostic Report" : "PuP 360 Progress Summary",
    MARGIN,
    32,
  );

  if (isPremium) {
    setFill(doc, C.premium);
    doc.roundedRect(PAGE_WIDTH - MARGIN - 38, 14, 38, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setText(doc, [255, 255, 255]);
    doc.text("PREMIUM", PAGE_WIDTH - MARGIN - 19, 19.5, { align: "center" });
  }

  let y = 66;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setText(doc, C.text);
  doc.text(payload.firstName, MARGIN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText(doc, C.muted);
  doc.text(`Assessment date · ${formatDate(payload.assessmentDate)}`, MARGIN, y);
  y += 6;
  doc.text(`Classification · ${payload.classificationName}`, MARGIN, y);
  y += 12;

  return y;
}

function drawScoreSummaryRow(doc: jsPDF, payload: PupPdfPayload, y: number): number {
  const metrics = [
    { label: "Stability", score: payload.scores.stability, color: C.stability },
    { label: "Performance", score: payload.scores.performance, color: C.performance },
    { label: "Alignment", score: payload.scores.alignment, color: C.alignment },
  ];
  const gap = 4;
  const cardW = (CONTENT_WIDTH - gap * 2) / 3;
  const cardH = 30;
  y = ensureSpace(doc, y, cardH + 6);

  metrics.forEach((m, i) => {
    const x = MARGIN + i * (cardW + gap);
    const scoreText = m.score.toFixed(1);
    drawRoundedCard(doc, x, y, cardW, cardH, C.card);
    setFill(doc, m.color);
    doc.rect(x, y, cardW, 3, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setText(doc, C.muted);
    doc.text(m.label.toUpperCase(), x + 4, y + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    setText(doc, C.text);
    const scoreW = doc.getTextWidth(scoreText);
    const scoreY = y + 23;
    doc.text(scoreText, x + 4, scoreY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, C.muted);
    doc.text(`/ ${MAX_SCORE.toFixed(1)}`, x + 4 + scoreW + 2, scoreY);
  });

  return y + cardH + 8;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  y = ensureSpace(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, C.primary);
  doc.text(title.toUpperCase(), MARGIN, y);

  setFill(doc, C.primary);
  doc.rect(MARGIN, y + 2, 18, 1.2, "F");
  setDraw(doc, C.border);
  doc.setLineWidth(0.15);
  doc.line(MARGIN, y + 2.8, PAGE_WIDTH - MARGIN, y + 2.8);

  return y + 10;
}

/** Keep section title with at least `minBodyHeight` of following content. */
function drawSectionBlock(
  doc: jsPDF,
  title: string,
  minBodyHeight: number,
  y: number,
): number {
  const needed = 16 + minBodyHeight;
  if (y + needed > contentBottom()) {
    doc.addPage();
    drawRunningHeader(doc);
    y = MARGIN + 12;
  }
  return drawSectionTitle(doc, title, y);
}

function drawBodyText(
  doc: jsPDF,
  text: string,
  y: number,
  options?: { fontSize?: number; width?: number; indent?: number; italic?: boolean },
): number {
  const fontSize = options?.fontSize ?? 10;
  const width = options?.width ?? CONTENT_WIDTH;
  const indent = options?.indent ?? 0;
  doc.setFont("helvetica", options?.italic ? "italic" : "normal");
  setText(doc, C.text);
  const lines = splitLines(doc, text, width - indent, fontSize);
  const lineH = fontSizeMm(fontSize) * LINE_FACTOR;
  let remaining = lines;

  while (remaining.length > 0) {
    const avail = contentBottom() - y;
    let maxLines = Math.floor(avail / lineH);
    if (maxLines < 1) {
      doc.addPage();
      drawRunningHeader(doc);
      y = MARGIN + 12;
      continue;
    }
    // Avoid leaving a single orphan line at the bottom when more follows.
    if (remaining.length > maxLines && maxLines > 2 && remaining.length - maxLines === 1) {
      maxLines -= 1;
    }
    const chunk = remaining.slice(0, maxLines);
    remaining = remaining.slice(maxLines);
    y = writeLines(doc, chunk, MARGIN + indent, y, fontSize);
    if (remaining.length > 0) {
      doc.addPage();
      drawRunningHeader(doc);
      y = MARGIN + 12;
    }
  }
  return y + 4;
}

function drawCallout(doc: jsPDF, text: string, y: number, accent: RGB = C.primarySoft): number {
  const pad = 5;
  const fontSize = 10;
  const innerW = CONTENT_WIDTH - pad * 2 - 4;
  doc.setFont("helvetica", "italic");
  const lines = splitLines(doc, text, innerW, fontSize);
  const boxH = pad * 2 + textBlockHeight(lines.length, fontSize);
  y = ensureSpace(doc, y, boxH + 4);

  drawRoundedCard(doc, MARGIN, y, CONTENT_WIDTH, boxH, accent);
  setFill(doc, C.primary);
  doc.rect(MARGIN, y, 2.5, boxH, "F");

  setText(doc, C.text);
  writeLines(doc, lines, MARGIN + pad + 2, firstBaseline(y, pad, fontSize), fontSize);
  return y + boxH + 6;
}

function drawFocusList(doc: jsPDF, areas: string[], y: number): number {
  for (const area of areas.slice(0, 3)) {
    const pad = 4;
    const fontSize = 9;
    doc.setFont("helvetica", "normal");
    const lines = splitLines(doc, area, CONTENT_WIDTH - pad * 2 - 8, fontSize);
    const boxH = pad * 2 + textBlockHeight(lines.length, fontSize);
    y = ensureSpace(doc, y, boxH + 3);

    drawRoundedCard(doc, MARGIN, y, CONTENT_WIDTH, boxH, C.primarySoft, 1.5);
    setFill(doc, C.primary);
    doc.circle(MARGIN + 5, y + boxH / 2, 0.9, "F");
    setText(doc, C.text);
    writeLines(doc, lines, MARGIN + pad + 6, firstBaseline(y, pad, fontSize), fontSize);
    y += boxH + 3;
  }
  return y + 4;
}

function drawReflectionBlock(
  doc: jsPDF,
  question: string,
  answer: string,
  y: number,
): number {
  const pad = 5;
  const innerW = CONTENT_WIDTH - pad * 2;
  doc.setFont("helvetica", "bold");
  const qLines = splitLines(doc, question, innerW, 8);
  doc.setFont("helvetica", "normal");
  const aLines = splitLines(doc, answer, innerW, 10);
  const boxH =
    pad * 2 +
    textBlockHeight(qLines.length, 8) +
    2 +
    textBlockHeight(aLines.length, 10);
  y = ensureSpace(doc, y, boxH + 4);

  drawRoundedCard(doc, MARGIN, y, CONTENT_WIDTH, boxH, C.card);

  let innerY = firstBaseline(y, pad, 8);
  setText(doc, C.muted);
  doc.setFont("helvetica", "bold");
  innerY = writeLines(doc, qLines, MARGIN + pad, innerY, 8) + 2;
  setText(doc, C.text);
  doc.setFont("helvetica", "normal");
  // After writeLines, innerY is below the last line; next baseline needs one line ascent.
  writeLines(doc, aLines, MARGIN + pad, innerY + fontSizeMm(10) * 0.15, 10);

  return y + boxH + 5;
}

function drawSubDimensionGroup(
  doc: jsPDF,
  pillar: string,
  questions: Array<{ label: string; score: number }>,
  y: number,
  color: RGB,
): number {
  const cols = 2;
  const colGap = 6;
  const colW = (CONTENT_WIDTH - 8 - colGap) / cols;
  const rowH = 8;
  const rows = Math.ceil(questions.length / cols);
  const headerH = 10;
  const boxH = headerH + rows * rowH + 6;
  y = ensureSpace(doc, y, boxH + 4);

  drawRoundedCard(doc, MARGIN, y, CONTENT_WIDTH, boxH, C.card);
  setFill(doc, color);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 2.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, C.text);
  doc.text(pillar, MARGIN + 4, y + headerH);

  const rowY = y + headerH + 5;
  questions.forEach((q, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = MARGIN + 4 + col * (colW + colGap);
    const itemY = rowY + row * rowH;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(doc, C.muted);
    doc.text(q.label, x, itemY);
    doc.setFont("helvetica", "bold");
    setText(doc, color);
    doc.text(q.score.toFixed(1), x + colW - 2, itemY, { align: "right" });
  });

  return y + boxH + 5;
}

function drawTrendChart(doc: jsPDF, payload: PupPdfPayload, y: number): number {
  const points = payload.scoreTrend ?? [];
  if (points.length < 2) {
    return drawBodyText(doc, "Not enough assessments yet for a trend chart.", y, {
      fontSize: 9,
    });
  }

  const chartH = 44;
  const pad = 6;
  const boxH = chartH + pad * 2 + 10;
  y = ensureSpace(doc, y, boxH);

  drawRoundedCard(doc, MARGIN, y, CONTENT_WIDTH, boxH, C.card);
  const chartTop = y + pad;
  const chartBottom = chartTop + chartH;
  const chartLeft = MARGIN + pad;
  const chartRight = PAGE_WIDTH - MARGIN - pad;
  const chartW = chartRight - chartLeft;

  setDraw(doc, C.border);
  doc.setLineWidth(0.15);
  for (let i = 0; i <= 4; i += 1) {
    const gy = chartBottom - (chartH / 4) * i;
    doc.line(chartLeft, gy, chartRight, gy);
  }

  const series: Array<{ key: keyof (typeof points)[0]; color: RGB; label: string }> = [
    { key: "stability", color: C.stability, label: "Stability" },
    { key: "performance", color: C.performance, label: "Performance" },
    { key: "alignment", color: C.alignment, label: "Alignment" },
  ];

  for (const { key, color } of series) {
    const values = points
      .map((p, i) => {
        const v = p[key];
        if (typeof v !== "number") return null;
        return { i, v };
      })
      .filter((p): p is { i: number; v: number } => p !== null);

    if (values.length < 2) continue;
    setDraw(doc, color);
    doc.setLineWidth(0.9);
    for (let i = 1; i < values.length; i += 1) {
      const prev = values[i - 1];
      const curr = values[i];
      const x1 = chartLeft + (prev.i / (points.length - 1)) * chartW;
      const x2 = chartLeft + (curr.i / (points.length - 1)) * chartW;
      const y1 = chartBottom - (prev.v / MAX_SCORE) * chartH;
      const y2 = chartBottom - (curr.v / MAX_SCORE) * chartH;
      doc.line(x1, y1, x2, y2);
      setFill(doc, color);
      doc.circle(x2, y2, 0.8, "F");
    }
  }

  let legendX = chartLeft;
  const legendY = chartBottom + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  for (const { color, label } of series) {
    setFill(doc, color);
    doc.circle(legendX + 1, legendY - 1, 1.2, "F");
    setText(doc, C.muted);
    doc.text(label, legendX + 3.5, legendY);
    legendX += doc.getTextWidth(label) + 10;
  }

  return y + boxH + 6;
}

function drawPathRow(
  doc: jsPDF,
  pathName: string,
  status: string,
  sessions: number,
  y: number,
): number {
  const pad = 4;
  const nameSize = 9;
  const metaSize = 8;
  doc.setFont("helvetica", "bold");
  const nameLines = splitLines(doc, pathName, CONTENT_WIDTH - pad * 2, nameSize);
  const rowH =
    pad +
    textBlockHeight(nameLines.length, nameSize) +
    3 +
    fontSizeMm(metaSize) +
    pad;
  y = ensureSpace(doc, y, rowH + 3);
  drawRoundedCard(doc, MARGIN, y, CONTENT_WIDTH, rowH, C.card, 1.5);

  setText(doc, C.text);
  const nameBottom = writeLines(
    doc,
    nameLines,
    MARGIN + pad,
    firstBaseline(y, pad, nameSize),
    nameSize,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(metaSize);
  setText(doc, C.muted);
  doc.text(`${status} · ${sessions} sessions`, MARGIN + pad, nameBottom + 3);

  return y + rowH + 3;
}

function drawFooter(doc: jsPDF, payload: PupPdfPayload): void {
  const disclaimer = payload.disclaimer || COACHING_DISCLAIMER;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    const footerTop = PAGE_HEIGHT - FOOTER_RESERVE;

    setDraw(doc, C.border);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, footerTop, PAGE_WIDTH - MARGIN, footerTop);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setText(doc, C.primary);
    const brand = payload.premiumBranding
      ? `${payload.platformName} · Premium Diagnostic`
      : `${payload.platformName} · PuP 360 Summary`;
    doc.text(brand, MARGIN, footerTop + 5);

    doc.setFont("helvetica", "normal");
    setText(doc, C.muted);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN, footerTop + 5, {
      align: "right",
    });

    doc.setFontSize(5.5);
    const lines = doc.splitTextToSize(disclaimer, CONTENT_WIDTH) as string[];
    doc.text(lines.slice(0, 3), MARGIN, footerTop + 10, { lineHeightFactor: 1.2 });
  }
}

/** Render PuP PDF bytes from an assembled payload (Pro 1–2 pages, Premium 4–6). */
export function renderPupPdf(payload: PupPdfPayload): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const subDimensions = sanitizeSubDimensions(payload.subDimensions);
  let y = drawCover(doc, payload);

  y = drawSectionTitle(doc, "Your dimension scores", y);
  y = drawScoreSummaryRow(doc, payload, y);

  y = drawSectionTitle(doc, "Classification", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(doc, C.text);
  y = ensureSpace(doc, y, 10);
  doc.text(payload.classificationName, MARGIN, y);
  y += 7;
  if (payload.classificationDescription) {
    y = drawBodyText(doc, payload.classificationDescription, y, { fontSize: 10 });
  }

  if (payload.focusAreas.length > 0) {
    const firstAreaLines = splitLines(
      doc,
      payload.focusAreas[0] ?? "",
      CONTENT_WIDTH - 16,
      9,
    );
    y = drawSectionBlock(
      doc,
      "Top focus areas",
      textBlockHeight(Math.max(firstAreaLines.length, 1), 9) + 12,
      y,
    );
    y = drawFocusList(doc, payload.focusAreas, y);
  }

  if (payload.trajectoryStatement) {
    const trajLines = splitLines(doc, payload.trajectoryStatement, CONTENT_WIDTH - 14, 10);
    y = drawSectionBlock(
      doc,
      "Trajectory",
      textBlockHeight(trajLines.length, 10) + 16,
      y,
    );
    y = drawCallout(doc, payload.trajectoryStatement, y, C.callout);
  }

  {
    const ctxLines = splitLines(doc, payload.narrative.coachingContext, CONTENT_WIDTH - 14, 10);
    y = drawSectionBlock(
      doc,
      "Coaching context",
      textBlockHeight(ctxLines.length, 10) + 16,
      y,
    );
    y = drawCallout(doc, payload.narrative.coachingContext, y, C.primarySoft);
  }

  if (payload.microCommitment) {
    const mcLines = splitLines(doc, payload.microCommitment, CONTENT_WIDTH - 14, 10);
    y = drawSectionBlock(
      doc,
      "Active micro-commitment",
      textBlockHeight(mcLines.length, 10) + 16,
      y,
    );
    y = drawCallout(doc, payload.microCommitment, y, [236, 248, 242]);
  }

  if (payload.reflections.length > 0) {
    y = drawSectionBlock(doc, "Your reflections", 28, y);
    for (const reflection of payload.reflections) {
      y = drawReflectionBlock(doc, reflection.question, reflection.answer, y);
    }
  }

  if (payload.tier === "premium") {
    if (subDimensions.length > 0) {
      y = drawSectionBlock(doc, "Sub-dimension scores", 36, y);
      const pillarColors: Record<string, RGB> = {
        Stability: C.stability,
        Performance: C.performance,
        Alignment: C.alignment,
      };
      for (const group of subDimensions) {
        y = drawSubDimensionGroup(
          doc,
          group.pillar,
          group.questions,
          y,
          pillarColors[group.pillar] ?? C.primary,
        );
      }
    }

    y = drawSectionBlock(doc, "Score trend history", 60, y);
    y = drawTrendChart(doc, payload, y);

    if (payload.behavioralFingerprint) {
      const fpLines = splitLines(doc, payload.behavioralFingerprint, CONTENT_WIDTH - 14, 10);
      y = drawSectionBlock(
        doc,
        "Behavioral fingerprint",
        textBlockHeight(fpLines.length, 10) + 16,
        y,
      );
      y = drawCallout(doc, payload.behavioralFingerprint, y, [244, 240, 250]);
    }

    if (payload.pathHistory && payload.pathHistory.length > 0) {
      y = drawSectionBlock(doc, "Path completion history", 20, y);
      for (const path of payload.pathHistory) {
        y = drawPathRow(
          doc,
          path.pathName,
          path.status,
          path.completedSessionsCount,
          y,
        );
      }
    }

    if (payload.narrative.coachingSummary) {
      const summaryLines = splitLines(
        doc,
        payload.narrative.coachingSummary,
        CONTENT_WIDTH,
        10,
      );
      y = drawSectionBlock(
        doc,
        "Coaching summary",
        Math.min(textBlockHeight(summaryLines.length, 10) + 8, 80),
        y,
      );
      y = drawBodyText(doc, payload.narrative.coachingSummary, y, { fontSize: 10 });
    }

    if (payload.narrative.nextFocus) {
      const focusLines = splitLines(
        doc,
        payload.narrative.nextFocus,
        CONTENT_WIDTH - 14,
        10,
      );
      y = drawSectionBlock(
        doc,
        "Next 90-day focus",
        textBlockHeight(focusLines.length, 10) + 16,
        y,
      );
      y = drawCallout(doc, payload.narrative.nextFocus, y, [255, 248, 236]);
    }
  }

  drawFooter(doc, payload);
  return new Uint8Array(doc.output("arraybuffer"));
}

export function pupPdfContainsDisclaimer(bytes: Uint8Array): boolean {
  const sample = new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.length, 200_000)));
  return sample.includes("not a substitute for therapy") || sample.includes("988");
}
