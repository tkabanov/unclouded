import { jsPDF } from "jspdf";
import type { ResultsData } from "@/lib/classification";
import {
  computeScoreDeltas,
  reflectionQuestions,
  summarizeProgress,
  type ReflectionAnswers,
} from "@/lib/reassessment";

const PRIMARY: [number, number, number] = [48, 120, 116];
const TEXT: [number, number, number] = [38, 45, 45];
const MUTED: [number, number, number] = [110, 120, 120];

function scoreBarColor(score: number): [number, number, number] {
  if (score < 3.2) return [200, 70, 70];
  if (score < 3.8) return [217, 155, 45];
  return [40, 160, 110];
}

function deltaTextColor(delta: number): [number, number, number] {
  if (delta >= 0.2) return [40, 160, 110];
  if (delta <= -0.2) return [200, 70, 70];
  return MUTED;
}

function slugifyName(firstName: string): string {
  const slug = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-");
  return slug || "your";
}

/** Client-side Day 0 vs Day 90 progress PDF (Lovable dashboard download). */
export function downloadReassessmentProgressPdf(
  firstName: string,
  first: ResultsData,
  second: ResultsData,
  reflections?: ReflectionAnswers | null,
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 56;

  const advance = (amount = 16) => {
    y += amount;
  };

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 8, "F");

  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Uncloud360", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("90-Day Reassessment · Progress Report", margin, y + 16);
  doc.text(
    new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    pageWidth - margin,
    y + 16,
    { align: "right" },
  );

  advance(44);
  const summary = summarizeProgress(first, second, firstName);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const headlineLines = doc.splitTextToSize(summary.headline, contentWidth);
  doc.text(headlineLines, margin, y);
  y += headlineLines.length * 18;
  advance(18);

  doc.setFontSize(13);
  doc.text("Scores: Day 0 vs Day 90", margin, y);
  advance(22);

  for (const row of computeScoreDeltas(first, second)) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.text(row.label, margin, y);

    const deltaLabel = `${row.first.toFixed(1)}  →  ${row.second.toFixed(1)}   (${row.delta > 0 ? "+" : ""}${row.delta.toFixed(1)})`;
    doc.setTextColor(...deltaTextColor(row.delta));
    doc.setFont("helvetica", "bold");
    doc.text(deltaLabel, pageWidth - margin, y, { align: "right" });

    const barTop = y + 6;
    doc.setFillColor(228, 230, 230);
    doc.roundedRect(margin, barTop, contentWidth, 6, 3, 3, "F");
    doc.setFillColor(180, 186, 186);
    doc.roundedRect(margin, barTop, Math.max(4, (row.first / 5) * contentWidth), 6, 3, 3, "F");
    doc.setFillColor(...scoreBarColor(row.second));
    doc.roundedRect(margin, barTop + 8, Math.max(4, (row.second / 5) * contentWidth), 6, 3, 3, "F");
    y += 34;
  }

  advance(6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...TEXT);
  doc.text("Classification", margin, y);
  advance(18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  const classificationLine = summary.classificationChanged
    ? `${first.classification.name}  →  ${second.classification.name}`
    : `${second.classification.name} (unchanged)`;
  doc.text(classificationLine, margin, y);
  advance(16);
  doc.setTextColor(...MUTED);
  doc.text(`Pressure: ${first.pressure_profile}  →  ${second.pressure_profile}`, margin, y);
  advance(24);

  const answeredReflections = reflectionQuestions.filter(
    (question) => (reflections?.[question.field] ?? "").trim().length > 0,
  );

  if (answeredReflections.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...TEXT);
    doc.text("Progress Reflections", margin, y);
    advance(20);

    for (const question of answeredReflections) {
      if (y > doc.internal.pageSize.getHeight() - 90) {
        doc.addPage();
        y = 56;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      const questionLines = doc.splitTextToSize(question.question, contentWidth);
      doc.text(questionLines, margin, y);
      y += questionLines.length * 13;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      const answerLines = doc.splitTextToSize(reflections?.[question.field] ?? "", contentWidth);
      doc.text(answerLines, margin, y);
      y += answerLines.length * 13 + 12;
    }
  }

  const footerY = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(220, 222, 222);
  doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const disclaimerLines = doc.splitTextToSize(
    "Uncloud360 provides AI-powered coaching only — not therapy, diagnosis, or medical advice. In an emergency, call 988 or 911.",
    contentWidth,
  );
  doc.text(disclaimerLines, margin, footerY);

  doc.save(`uncloud360-progress-${slugifyName(firstName)}.pdf`);
}
