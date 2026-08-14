import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  clearStoredJoinCode,
  isValidEnrollmentCodeFormat,
  normalizeEnrollmentCode,
  storeJoinCode,
} from "@/lib/workplace/enrollmentCodeFormat";
import { redeemWorkplaceEnrollmentCode } from "@/lib/workplace/workplaceEnrollmentApi";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/lib/userProfile";
import {
  isOnboardingComplete,
  resolvePostAuthRouteForUser,
} from "@/lib/userProfile/onboardingStatus";

/**
 * Public join entry: /join/:code
 * Validates the enrollment code, then signup / onboarding / in-place redeem.
 */
type JoinFailureKind = "invalid" | "inactive" | "seats_full" | "network" | "already_other_org";

type PeekResult = {
  ok?: boolean;
  error?: string;
  workplaceName?: string;
  seatsFull?: boolean;
};

export default function JoinWorkplacePage() {
  const { code: rawCode } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refresh } = useUserProfile();
  const [error, setError] = useState<string | null>(null);
  const [failureKind, setFailureKind] = useState<JoinFailureKind | null>(null);
  const [workplaceName, setWorkplaceName] = useState<string | null>(null);
  const [peekOk, setPeekOk] = useState(false);
  const [checking, setChecking] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);
  const redeemStartedRef = useRef(false);
  const profileRef = useRef(profile);
  const userRef = useRef(user);
  profileRef.current = profile;
  userRef.current = user;

  const code = normalizeEnrollmentCode(decodeURIComponent(rawCode ?? ""));
  const userId = user?.id ?? null;
  const onboardingDone = isOnboardingComplete(profile);

  // Peek once per code (or explicit retry). Must not depend on profile — after
  // redeem, refresh() used to re-invoke peek, burn the 12/min limit, and cancel
  // toast + dashboard navigation (EAC-C-EDGE-006).
  useEffect(() => {
    redeemStartedRef.current = false;
    let cancelled = false;

    async function peek() {
      setPeekOk(false);
      setWorkplaceName(null);
      setError(null);
      setFailureKind(null);
      setChecking(true);

      if (!isValidEnrollmentCodeFormat(code)) {
        if (!cancelled) {
          setFailureKind("invalid");
          setError("This join link is invalid. Ask your HR team for a new enrollment code.");
          setChecking(false);
        }
        return;
      }

      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "peek-workplace-enrollment",
          { body: { code } },
        );
        if (cancelled) return;

        if (invokeError) {
          const status = (invokeError as { context?: { status?: number } }).context?.status;
          if (status === 429) {
            setFailureKind("network");
            setError("Too many enrollment lookups. Try again shortly.");
          } else {
            setFailureKind("network");
            setError("Couldn't validate this join link. Try again or contact HR.");
          }
          setChecking(false);
          return;
        }

        const payload = data as PeekResult | null;
        if (payload && typeof payload === "object" && "error" in payload && !payload.ok) {
          if (
            typeof payload.error === "string" &&
            /too many enrollment lookups/i.test(payload.error)
          ) {
            setFailureKind("network");
            setError(payload.error);
            setChecking(false);
            return;
          }
        }

        if (!payload?.ok) {
          const seatsFull =
            payload?.seatsFull === true ||
            (typeof payload?.error === "string" && /seats are full/i.test(payload.error));
          const inactive =
            typeof payload?.error === "string" &&
            /enrollment is not active|inactive or expired/i.test(payload.error);

          if (seatsFull) {
            setFailureKind("seats_full");
            setError(
              payload?.error ??
                "Your organization's seats are full. Contact your HR team.",
            );
          } else if (inactive) {
            setFailureKind("inactive");
            setError(
              payload?.error ??
                "This join link is inactive or expired. Ask your HR team for a new enrollment code.",
            );
          } else {
            setFailureKind("invalid");
            setError(
              payload?.error ??
                "This join link is inactive or expired. Ask your HR team for a new enrollment code.",
            );
          }
          setChecking(false);
          return;
        }

        setWorkplaceName(
          typeof payload.workplaceName === "string" ? payload.workplaceName : null,
        );
        setPeekOk(true);
      } catch {
        if (!cancelled) {
          setFailureKind("network");
          setError("Couldn't validate this join link. Try again or contact HR.");
          setChecking(false);
        }
      }
    }

    void peek();
    return () => {
      cancelled = true;
    };
  }, [code, retryNonce]);

  useEffect(() => {
    if (!peekOk || error) return;
    if (authLoading || (userId && profileLoading)) return;
    if (redeemStartedRef.current) return;

    if (!userId) {
      storeJoinCode(code);
      setChecking(false);
      navigate(`/signup?enterpriseCode=${encodeURIComponent(code)}`, { replace: true });
      return;
    }

    if (!onboardingDone) {
      storeJoinCode(code);
      setChecking(false);
      navigate("/onboarding", { replace: true });
      return;
    }

    redeemStartedRef.current = true;
    const currentUser = userRef.current;
    const currentProfile = profileRef.current;

    void (async () => {
      try {
        const result = await redeemWorkplaceEnrollmentCode(code);
        clearStoredJoinCode();
        toast.success(
          result.alreadyEnrolled
            ? `You're already enrolled with ${result.workplaceName || "your organization"}.`
            : `Joined ${result.workplaceName || "your organization"}.`,
        );
        const dest = await resolvePostAuthRouteForUser({
          profile: currentProfile
            ? {
                ...currentProfile,
                accountType: "enterprise",
                enterpriseTier: result.enterpriseTier || currentProfile.enterpriseTier,
              }
            : currentProfile,
          userId,
          email: currentUser?.email,
        });
        await refresh({ silent: true }).catch(() => undefined);
        navigate(dest, { replace: true });
      } catch (redeemErr) {
        redeemStartedRef.current = false;
        const message =
          redeemErr instanceof Error
            ? redeemErr.message
            : "Couldn't complete workplace enrollment.";
        if (/already enrolled with another organization/i.test(message)) {
          setFailureKind("already_other_org");
          setError(
            "You're already linked to another organization. Contact support if you need to transfer.",
          );
        } else if (/seats are full/i.test(message)) {
          setFailureKind("seats_full");
          setError(message);
        } else {
          setFailureKind("network");
          setError(message);
        }
        setChecking(false);
      }
    })();
  }, [
    peekOk,
    error,
    authLoading,
    profileLoading,
    userId,
    onboardingDone,
    code,
    navigate,
    refresh,
  ]);

  if (checking || authLoading || (user && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Checking enrollment link…</p>
      </div>
    );
  }

  if (error) {
    const title =
      failureKind === "seats_full"
        ? "No seats available"
        : failureKind === "inactive"
          ? "Enrollment unavailable"
          : failureKind === "already_other_org"
            ? "Already enrolled elsewhere"
            : failureKind === "network"
              ? "Couldn't validate link"
              : "Unable to join";
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex justify-center gap-2">
            {failureKind === "network" ? (
              <Button type="button" variant="outline" onClick={() => setRetryNonce((n) => n + 1)}>
                Try again
              </Button>
            ) : null}
            <Button asChild>
              <Link to={user ? "/dashboard" : "/"}>
                {user ? "Dashboard" : "Home"}
              </Link>
            </Button>
          </div>
          {failureKind === "seats_full" ? (
            <p className="text-xs text-muted-foreground">
              This link is valid, but the organization has no open seats. Ask HR to free a seat or
              increase capacity.
            </p>
          ) : failureKind === "already_other_org" ? (
            <p className="text-xs text-muted-foreground">
              Each account can belong to only one organization. Ask your HR team or support for help
              transferring.
            </p>
          ) : failureKind === "network" ? (
            <p className="text-xs text-muted-foreground">
              If this keeps happening, contact your HR team for a new enrollment code.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ask your HR team for a current enrollment code or join link. Do not continue as an
              individual Free account from this enterprise link.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">
        {workplaceName
          ? `Joining ${workplaceName}…`
          : "Opening workplace enrollment…"}
      </p>
    </div>
  );
}
