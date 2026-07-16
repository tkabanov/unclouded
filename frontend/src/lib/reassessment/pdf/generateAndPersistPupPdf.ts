import { fetchPupPdfPayload } from "@/lib/reassessment/pdf/generatePupPdfApi";
import { persistPupPdf } from "@/lib/reassessment/pdf/persistPupPdf";
import { renderPupPdf } from "@/lib/reassessment/pdf/renderPupPdf";
import type { PupPdfPayload } from "@/lib/reassessment/pdf/pupPdfTypes";

export type GeneratedPupPdf = {
  payload: PupPdfPayload;
  bytes: Uint8Array;
  storagePath: string;
};

/** Full client pipeline: edge payload → jspdf → storage → assessmentResult flags. */
export async function generateAndPersistPupPdf(params: {
  userId: string;
  assessmentResultId: string;
  force?: boolean;
}): Promise<GeneratedPupPdf> {
  const payload = await fetchPupPdfPayload(params.assessmentResultId, {
    force: params.force,
  });
  const bytes = renderPupPdf(payload);
  const storagePath = await persistPupPdf({
    userId: params.userId,
    assessmentResultId: params.assessmentResultId,
    bytes,
    narrative: payload.narrative,
  });
  return { payload, bytes, storagePath };
}
