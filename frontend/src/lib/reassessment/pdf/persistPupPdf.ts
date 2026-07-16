import { supabase } from "@/integrations/supabase/client";
import {
  PUP_PDF_STORAGE_BUCKET,
  PUP_PDF_RENDER_VERSION,
  pdfStoragePath,
  type PupPdfNarrative,
} from "@/lib/reassessment/pdf/pupPdfTypes";

export async function persistPupPdf(params: {
  userId: string;
  assessmentResultId: string;
  bytes: Uint8Array;
  narrative?: PupPdfNarrative | null;
}): Promise<string> {
  const path = pdfStoragePath(params.userId, params.assessmentResultId);
  const blob = new Blob([params.bytes], { type: "application/pdf" });

  const { error: uploadError } = await supabase.storage
    .from(PUP_PDF_STORAGE_BUCKET)
    .upload(path, blob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const update: Record<string, unknown> = {
    pdfGenerated: true,
    pdfUrl: path,
  };
  if (params.narrative) {
    update.pdfNarrative = {
      ...params.narrative,
      generatedForTier: params.narrative.generatedForTier ?? undefined,
      renderVersion: PUP_PDF_RENDER_VERSION,
    };
  }

  const { error: updateError } = await supabase
    .from("assessmentResult")
    .update(update as never)
    .eq("id", params.assessmentResultId)
    .eq("userId", params.userId);

  if (updateError) throw updateError;
  return path;
}
