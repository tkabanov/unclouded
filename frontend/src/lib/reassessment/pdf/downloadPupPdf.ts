import { supabase } from "@/integrations/supabase/client";
import { PUP_PDF_STORAGE_BUCKET } from "@/lib/reassessment/pdf/pupPdfTypes";

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Download an already-persisted PDF via signed URL, or from in-memory bytes. */
export async function downloadPupPdf(params: {
  storagePath?: string | null;
  bytes?: Uint8Array | null;
  filename: string;
}): Promise<void> {
  if (params.bytes && params.bytes.length > 0) {
    triggerBrowserDownload(
      new Blob([params.bytes], { type: "application/pdf" }),
      params.filename,
    );
    return;
  }

  if (!params.storagePath) {
    throw new Error("No PDF available to download");
  }

  const { data, error } = await supabase.storage
    .from(PUP_PDF_STORAGE_BUCKET)
    .createSignedUrl(params.storagePath, 60 * 10);

  if (error || !data?.signedUrl) {
    throw error ?? new Error("Could not create download link");
  }

  const response = await fetch(data.signedUrl);
  if (!response.ok) throw new Error("Could not download PDF");
  const blob = await response.blob();
  triggerBrowserDownload(blob, params.filename);
}

export function pupPdfFilename(tier: "pro" | "premium", assessmentDateIso: string): string {
  const d = new Date(assessmentDateIso);
  const stamp = Number.isNaN(d.getTime())
    ? "report"
    : d.toISOString().slice(0, 10);
  return tier === "premium"
    ? `Uncloud360-PuP-360-report-${stamp}.pdf`
    : `Uncloud360-PuP-360-summary-${stamp}.pdf`;
}
