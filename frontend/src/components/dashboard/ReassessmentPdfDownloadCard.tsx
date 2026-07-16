import { useCallback, useEffect, useRef, useState } from "react";

import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useAuth } from "@/hooks/useAuth";

import { useUserProfile } from "@/lib/userProfile";

import { getLatestReassessmentResult } from "@/lib/reassessment/assessmentResultApi";

import {

  downloadPupPdf,

  pupPdfFilename,

} from "@/lib/reassessment/pdf/downloadPupPdf";

import { generateAndPersistPupPdf } from "@/lib/reassessment/pdf/generateAndPersistPupPdf";

import type { GeneratedPupPdf } from "@/lib/reassessment/pdf/generateAndPersistPupPdf";

import {

  pdfDownloadLabel,

  shouldGeneratePupPdf,

  type PupPdfTier,

} from "@/lib/reassessment/pdf/pupPdfTypes";

import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";

import { TIER } from "@/lib/enums/tier";

import { cn } from "@/lib/utils";

import { bubbleStyle } from "@/styles";

import { toast } from "sonner";



/** US-302 — dashboard download link for latest reassessment PDF. */

export default function ReassessmentPdfDownloadCard() {

  const { user } = useAuth();

  const { profile } = useUserProfile();

  const tier = resolveCurrentTier(!!profile?.subscribed, profile?.tier);

  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const [assessmentDate, setAssessmentDate] = useState<string | null>(null);

  const [cachedPdf, setCachedPdf] = useState<GeneratedPupPdf | null>(null);

  const [busy, setBusy] = useState(false);

  const [prepareError, setPrepareError] = useState(false);

  const [visible, setVisible] = useState(false);

  const prepareStartedRef = useRef<string | null>(null);



  const pdfTier: PupPdfTier | null =

    tier === TIER.PREMIUM ? "premium" : tier === TIER.PRO ? "pro" : null;



  useEffect(() => {

    if (!user?.id || !pdfTier || !profile?.reassessmentCompletedAt) {

      setVisible(false);

      return;

    }

    let cancelled = false;

    getLatestReassessmentResult(user.id)

      .then((row) => {

        if (cancelled || !row) {

          if (!cancelled) setVisible(false);

          return;

        }

        setAssessmentId(row.id);

        setAssessmentDate(row.assessmentDate);

        setVisible(true);

      })

      .catch(() => {

        if (!cancelled) setVisible(false);

      });

    return () => {

      cancelled = true;

    };

  }, [user?.id, pdfTier, profile?.reassessmentCompletedAt]);



  const preparePdf = useCallback(

    async (targetAssessmentId: string, force = false): Promise<GeneratedPupPdf> => {

      if (!user?.id || !pdfTier) {

        throw new Error("Not ready to generate PDF");

      }

      setBusy(true);

      setPrepareError(false);

      try {

        const generated = await generateAndPersistPupPdf({

          userId: user.id,

          assessmentResultId: targetAssessmentId,

          force,

        });

        setCachedPdf(generated);

        return generated;

      } catch (err) {

        setPrepareError(true);

        throw err;

      } finally {

        setBusy(false);

      }

    },

    [pdfTier, user?.id],

  );



  useEffect(() => {

    if (!visible || !user?.id || !assessmentId || !pdfTier) return;

    if (prepareStartedRef.current === assessmentId) return;



    let cancelled = false;

    prepareStartedRef.current = assessmentId;



    void (async () => {

      try {

        const row = await getLatestReassessmentResult(user.id);

        if (cancelled || !row || row.id !== assessmentId) return;



        if (!shouldGeneratePupPdf(row, pdfTier)) {

          setCachedPdf(null);

          return;

        }



        await preparePdf(assessmentId, true);

      } catch (err) {

        if (!cancelled) {

          console.error(err);

          toast.error("Couldn't prepare your PuP 360 PDF. Try the download button.");

        }

      }

    })();



    return () => {

      cancelled = true;

    };

  }, [assessmentId, pdfTier, preparePdf, user?.id, visible]);



  const handleDownload = useCallback(async () => {

    if (!user?.id || !assessmentId || !pdfTier) return;

    setBusy(true);

    try {

      const row = await getLatestReassessmentResult(user.id);

      if (!row || row.id !== assessmentId) {

        throw new Error("Assessment not found");

      }



      const mustRegenerate = shouldGeneratePupPdf(row, pdfTier);

      if (!mustRegenerate && row.pdfUrl) {
        await downloadPupPdf({
          storagePath: row.pdfUrl,
          filename: pupPdfFilename(pdfTier, row.assessmentDate),
        });
        return;
      }

      const generated = await preparePdf(assessmentId, true);

      await downloadPupPdf({
        bytes: generated.bytes,
        storagePath: generated.storagePath,
        filename: pupPdfFilename(pdfTier, generated.payload.assessmentDate),
      });

    } catch (err) {

      console.error(err);

      toast.error("Couldn't download your PuP 360 PDF.");

    } finally {

      setBusy(false);

    }

  }, [assessmentId, cachedPdf, pdfTier, preparePdf, user?.id]);



  if (!visible || !pdfTier) return null;



  const buttonLabel = busy

    ? "Preparing…"

    : prepareError

      ? "Retry download"

      : pdfDownloadLabel(pdfTier);



  return (

    <div

      className={cn(

        bubbleStyle("Group_card_"),

        "flex w-full flex-col items-stretch gap-3 border-border/80 p-5 sm:flex-row sm:items-center sm:justify-between",

      )}

    >

      <div className="flex items-start gap-3">

        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">

          <FileText className="h-5 w-5 text-foreground" aria-hidden />

        </div>

        <div className="space-y-0.5">

          <p className="font-semibold text-foreground">Your latest PuP 360 PDF</p>

          <p className="text-sm text-muted-foreground">

            {busy

              ? "Generating your updated report…"

              : prepareError

                ? "We couldn't prepare the report automatically. Retry download."

                : "Download the report from your most recent reassessment."}

          </p>

        </div>

      </div>

      <Button

        variant="outline"

        className="shrink-0 gap-2"

        disabled={busy}

        onClick={() => void handleDownload()}

      >

        <FileText className="h-4 w-4" aria-hidden />

        {buttonLabel}

      </Button>

    </div>

  );

}


