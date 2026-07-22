import { jsPDF } from "jspdf";
import type { ResultsData } from "@/lib/classification";

const PRIMARY: [number, number, number] = [48, 120, 116];
const TEXT: [number, number, number] = [38, 45, 45];
const MUTED: [number, number, number] = [110, 120, 120];

function scoreBarColor(score: number): [number, number, number] {
  if (score < 3.2) return [200, 70, 70];
  if (score < 3.8) return [217, 155, 45];
  return [40, 160, 110];
}

function slugifyName(firstName: string): string {
  const slug = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-");
  return slug || "your";
}

/** Client-side onboarding results PDF (Lovable dashboard hero download). */
export function downloadOnboardingResultsPdf(firstName: string, results: ResultsData): void {
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
  doc.text("Assessment Results", margin, y + 16);
  doc.text(
    new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    pageWidth - margin,
    y + 16,
    { align: "right" },
  );

  advance(44);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Here's what we're seeing, ${firstName.trim() || "there"}.`, margin, y);

  advance(28);
  doc.setFillColor(240, 246, 245);
  const descriptionLines = doc.splitTextToSize(results.classification.description, contentWidth - 32);
  const classificationBoxHeight = 58 + descriptionLines.length * 13;
  doc.roundedRect(margin, y, contentWidth, classificationBoxHeight, 8, 8, "F");

  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("YOUR CLASSIFICATION", margin + 16, y + 22);

  doc.setTextColor(...PRIMARY);
  doc.setFontSize(15);
  doc.text(results.classification.name, margin + 16, y + 40);

  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(descriptionLines, margin + 16, y + 56);

  y += classificationBoxHeight;
  advance(28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Your Scores", margin, y);
  advance(20);

  for (const row of [
    { label: "Stability", value: results.stability_score },
    { label: "Performance", value: results.performance_score },
    { label: "Alignment", value: results.alignment_score },
  ]) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.text(row.label, margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(`${row.value.toFixed(1)} / 5`, pageWidth - margin, y, { align: "right" });

    const barTop = y + 6;
    doc.setFillColor(228, 230, 230);
    doc.roundedRect(margin, barTop, contentWidth, 8, 4, 4, "F");
    doc.setFillColor(...scoreBarColor(row.value));
    doc.roundedRect(margin, barTop, Math.max(6, (row.value / 5) * contentWidth), 8, 4, 4, "F");
    y += 30;
  }

  advance(6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...TEXT);
  doc.text("Pressure Profile", margin, y);
  advance(18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text(results.pressure_profile, margin, y);
  advance(24);

  const activeModes: string[] = [];
  if (results.recovery_mode_active) activeModes.push("Recovery Mode");
  if (results.grief_mode_active) activeModes.push("Grief-Informed Mode");
  if (results.trauma_informed_mode) activeModes.push("Trauma-Informed Mode");
  if (activeModes.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(`Active support modes: ${activeModes.join(", ")}`, margin, y);
    advance(24);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...TEXT);
  doc.text("What This Means", margin, y);
  advance(18);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT);
  const tradeoffLines = doc.splitTextToSize(`"${results.tradeoff_statement}"`, contentWidth);
  doc.text(tradeoffLines, margin, y);
  y += tradeoffLines.length * 14;
  advance(20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Your Focus Areas", margin, y);
  advance(20);

  for (const area of results.classification.focusAreas) {
    doc.setFillColor(...PRIMARY);
    doc.circle(margin + 3, y - 3, 2.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...TEXT);
    const areaLines = doc.splitTextToSize(area, contentWidth - 20);
    doc.text(areaLines, margin + 16, y);
    y += areaLines.length * 14 + 6;
  }

  advance(10);
  doc.setFillColor(240, 246, 245);
  doc.roundedRect(margin, y, contentWidth, 40, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY);
  const moduleDaysLabel = results.module_days === 1 ? "day" : "days";
  doc.text(
    `Recommended next deep-dive:  ${results.first_module} (${results.module_days} ${moduleDaysLabel})`,
    margin + 16,
    y + 24,
  );

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

  doc.save(`uncloud360-results-${slugifyName(firstName)}.pdf`);
}
