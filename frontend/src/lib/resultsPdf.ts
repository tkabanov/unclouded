import { jsPDF } from "jspdf";
import type { ResultsData } from "./classification";
import {
  computeScoreDeltas,
  summarizeProgress,
  reflectionQuestions,
  type ReflectionAnswers,
} from "./reassessment";

// Brand teal ~ hsl(174 42% 33%)
const TEAL: [number, number, number] = [48, 120, 116];
const DARK: [number, number, number] = [38, 45, 45];
const MUTED: [number, number, number] = [110, 120, 120];
const AMBER: [number, number, number] = [217, 155, 45];
const GREEN: [number, number, number] = [40, 160, 110];
const RED: [number, number, number] = [200, 70, 70];

function scoreColor(score: number): [number, number, number] {
  if (score < 3.2) return RED;
  if (score < 3.8) return AMBER;
  return GREEN;
}

export function generateResultsPdf(firstName: string, results: ResultsData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = 56;

  const line = (gap = 16) => {
    y += gap;
  };

  // Header
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageW, 8, "F");

  doc.setTextColor(...TEAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Uncloud360", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("Assessment Results", margin, y + 16);
  doc.text(
    new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    pageW - margin,
    y + 16,
    { align: "right" }
  );
  line(44);

  // Greeting
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Here's what we're seeing, ${firstName || "there"}.`, margin, y);
  line(28);

  // Classification card
  doc.setFillColor(240, 246, 245);
  const clsDesc = doc.splitTextToSize(results.classification.description, contentW - 32);
  const cardH = 58 + clsDesc.length * 13;
  doc.roundedRect(margin, y, contentW, cardH, 8, 8, "F");
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("YOUR CLASSIFICATION", margin + 16, y + 22);
  doc.setTextColor(...TEAL);
  doc.setFontSize(15);
  doc.text(results.classification.name, margin + 16, y + 40);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(clsDesc, margin + 16, y + 56);
  y += cardH;
  line(28);

  // Scores
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Your Scores", margin, y);
  line(20);

  const scores: { label: string; value: number }[] = [
    { label: "Stability", value: results.stability_score },
    { label: "Performance", value: results.performance_score },
    { label: "Alignment", value: results.alignment_score },
  ];

  scores.forEach((s) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(s.label, margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(s.value.toFixed(1) + " / 5", pageW - margin, y, { align: "right" });

    const barY = y + 6;
    const barW = contentW;
    doc.setFillColor(228, 230, 230);
    doc.roundedRect(margin, barY, barW, 8, 4, 4, "F");
    doc.setFillColor(...scoreColor(s.value));
    doc.roundedRect(margin, barY, Math.max(6, (s.value / 5) * barW), 8, 4, 4, "F");
    y += 30;
  });
  line(6);

  // Pressure profile + modes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text("Pressure Profile", margin, y);
  line(18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...TEAL);
  doc.text(results.pressure_profile, margin, y);
  line(24);

  const activeModes: string[] = [];
  if (results.recovery_mode_active) activeModes.push("Recovery Mode");
  if (results.grief_mode_active) activeModes.push("Grief-Informed Mode");
  if (results.trauma_informed_mode) activeModes.push("Trauma-Informed Mode");
  if (activeModes.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text("Active support modes: " + activeModes.join(", "), margin, y);
    line(24);
  }

  // Tradeoff statement
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text("What This Means", margin, y);
  line(18);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(...DARK);
  const tradeoff = doc.splitTextToSize(`"${results.tradeoff_statement}"`, contentW);
  doc.text(tradeoff, margin, y);
  y += tradeoff.length * 14;
  line(20);

  // Focus areas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text("Your Focus Areas", margin, y);
  line(20);
  results.classification.focusAreas.forEach((area) => {
    doc.setFillColor(...TEAL);
    doc.circle(margin + 3, y - 3, 2.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...DARK);
    const areaLines = doc.splitTextToSize(area, contentW - 20);
    doc.text(areaLines, margin + 16, y);
    y += areaLines.length * 14 + 6;
  });
  line(10);

  // Next module
  doc.setFillColor(240, 246, 245);
  doc.roundedRect(margin, y, contentW, 40, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEAL);
  doc.text(
    `Recommended next deep-dive:  ${results.first_module} (${results.module_days} ${results.module_days === 1 ? "day" : "days"})`,
    margin + 16,
    y + 24
  );
  y += 40;

  // Footer disclaimer
  const footerY = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(220, 222, 222);
  doc.line(margin, footerY - 12, pageW - margin, footerY - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const disclaimer = doc.splitTextToSize(
    "Uncloud360 provides AI-powered coaching only — not therapy, diagnosis, or medical advice. In an emergency, call 988 or 911.",
    contentW
  );
  doc.text(disclaimer, margin, footerY);

  const safeName = (firstName || "your").toLowerCase().replace(/[^a-z0-9]/g, "-");
  doc.save(`uncloud360-results-${safeName}.pdf`);
}

export function generateComparisonPdf(
  firstName: string,
  first: ResultsData,
  second: ResultsData,
  reflections?: ReflectionAnswers | null
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = 56;

  const line = (gap = 16) => {
    y += gap;
  };

  // Header
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageW, 8, "F");
  doc.setTextColor(...TEAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Uncloud360", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("90-Day Reassessment · Progress Report", margin, y + 16);
  doc.text(
    new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    pageW - margin,
    y + 16,
    { align: "right" }
  );
  line(44);

  // Headline
  const summary = summarizeProgress(first, second, firstName);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const headline = doc.splitTextToSize(summary.headline, contentW);
  doc.text(headline, margin, y);
  y += headline.length * 18;
  line(18);

  // Score comparison
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text("Scores: Day 0 vs Day 90", margin, y);
  line(22);

  const deltas = computeScoreDeltas(first, second);
  deltas.forEach((d) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(d.label, margin, y);
    const deltaText = `${d.first.toFixed(1)}  \u2192  ${d.second.toFixed(1)}   (${d.delta > 0 ? "+" : ""}${d.delta.toFixed(1)})`;
    const deltaColor = d.delta >= 0.2 ? GREEN : d.delta <= -0.2 ? RED : MUTED;
    doc.setTextColor(...deltaColor);
    doc.setFont("helvetica", "bold");
    doc.text(deltaText, pageW - margin, y, { align: "right" });

    const barY = y + 6;
    const barW = contentW;
    doc.setFillColor(228, 230, 230);
    doc.roundedRect(margin, barY, barW, 6, 3, 3, "F");
    doc.setFillColor(180, 186, 186);
    doc.roundedRect(margin, barY, Math.max(4, (d.first / 5) * barW), 6, 3, 3, "F");
    doc.setFillColor(...scoreColor(d.second));
    doc.roundedRect(margin, barY + 8, Math.max(4, (d.second / 5) * barW), 6, 3, 3, "F");
    y += 34;
  });
  line(6);

  // Classification change
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text("Classification", margin, y);
  line(18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  const clsText = summary.classificationChanged
    ? `${first.classification.name}  \u2192  ${second.classification.name}`
    : `${second.classification.name} (unchanged)`;
  doc.text(clsText, margin, y);
  line(16);
  doc.setTextColor(...MUTED);
  doc.text(`Pressure: ${first.pressure_profile}  \u2192  ${second.pressure_profile}`, margin, y);
  line(24);

  // Reflections
  const answered = reflectionQuestions.filter(
    (q) => (reflections?.[q.field] ?? "").trim().length > 0
  );
  if (answered.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text("Progress Reflections", margin, y);
    line(20);
    answered.forEach((q) => {
      if (y > doc.internal.pageSize.getHeight() - 90) {
        doc.addPage();
        y = 56;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      const qLines = doc.splitTextToSize(q.question, contentW);
      doc.text(qLines, margin, y);
      y += qLines.length * 13;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      const aLines = doc.splitTextToSize(reflections?.[q.field] ?? "", contentW);
      doc.text(aLines, margin, y);
      y += aLines.length * 13 + 12;
    });
  }

  // Footer disclaimer
  const footerY = doc.internal.pageSize.getHeight() - 40;
  doc.setDrawColor(220, 222, 222);
  doc.line(margin, footerY - 12, pageW - margin, footerY - 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const disclaimer = doc.splitTextToSize(
    "Uncloud360 provides AI-powered coaching only — not therapy, diagnosis, or medical advice. In an emergency, call 988 or 911.",
    contentW
  );
  doc.text(disclaimer, margin, footerY);

  const safeName = (firstName || "your").toLowerCase().replace(/[^a-z0-9]/g, "-");
  doc.save(`uncloud360-progress-${safeName}.pdf`);
}
