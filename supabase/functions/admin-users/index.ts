/**
 * Platform admin — user list/detail and Active/Deactivated (with auth ban).
 *
 * POST /functions/v1/admin-users
 * Body: {
 *   action: "list" | "get" | "setActive",
 *   userId?: string,
 *   isActive?: boolean,
 *   search?: string,
 *   typeFilter?: "free" | "pro" | "premium" | "canceled" | "all",
 *   statusFilter?: "active" | "deactivated" | "all",
 *   workplaceId?: string,
 * }
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { isValidUuid } from "../_shared/uuidHelpers.ts";

type ActionBody = {
  action?: "list" | "get" | "setActive";
  userId?: string;
  isActive?: boolean;
  search?: string;
  typeFilter?: "free" | "pro" | "premium" | "canceled" | "all";
  statusFilter?: "active" | "deactivated" | "all";
  workplaceId?: string;
};

type AdminUserType = "free" | "pro" | "premium" | "canceled";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function displayName(firstName: string | null, lastName: string | null, email: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return email?.trim() || "Unknown user";
}

function resolveAdminUserType(row: {
  accountType?: string | null;
  enterpriseTier?: string | null;
  tier?: string | null;
  subscribed?: boolean | null;
  subscriptionStatus?: string | null;
  subscriptionPlanTier?: string | null;
}): AdminUserType {
  if ((row.accountType ?? "").toLowerCase() === "enterprise") {
    const et = (row.enterpriseTier ?? "").toLowerCase();
    if (et === "premium") return "premium";
    return "pro";
  }

  const status = (row.subscriptionStatus ?? "").trim();
  if (status === "inactive") return "canceled";

  const planTier = (row.subscriptionPlanTier ?? row.tier ?? "free").toLowerCase();

  if (
    status === "active" ||
    status === "scheduledToCancel" ||
    status === "scheduledToDowngrade" ||
    status === "pastDue"
  ) {
    if (planTier === "premium") return "premium";
    if (planTier === "pro") return "pro";
  }

  if (row.subscribed === true) {
    const t = (row.tier ?? "").toLowerCase();
    if (t === "premium") return "premium";
    return "pro";
  }

  return "free";
}

async function assertSettingsAdmin(
  userClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await userClient
    .from("profiles")
    .select("roleType")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.roleType === "admin";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Missing Supabase env" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!jwt) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: ActionBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = body.action;
  if (action !== "list" && action !== "get" && action !== "setActive") {
    return json({ error: "Invalid action" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser(jwt);
  if (authError || !authData.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const isAdmin = await assertSettingsAdmin(userClient, authData.user.id);
    if (!isAdmin) {
      return json({ error: "Forbidden" }, 403);
    }

    if (action === "setActive") {
      const targetId = body.userId?.trim();
      if (!targetId || !isValidUuid(targetId)) {
        return json({ error: "Valid userId is required" }, 400);
      }
      if (typeof body.isActive !== "boolean") {
        return json({ error: "isActive boolean is required" }, 400);
      }

      const { error: rpcError } = await userClient.rpc("admin_set_profile_active", {
        p_user_id: targetId,
        p_is_active: body.isActive,
      });
      if (rpcError) {
        return json({ error: rpcError.message || "Couldn't update status" }, 400);
      }

      // Ban / unban auth user so deactivated accounts cannot sign in.
      if (body.isActive) {
        const { error: banError } = await admin.auth.admin.updateUserById(targetId, {
          ban_duration: "none",
        });
        if (banError) {
          return json({ error: banError.message || "Couldn't clear auth ban" }, 500);
        }
      } else {
        const { error: banError } = await admin.auth.admin.updateUserById(targetId, {
          ban_duration: "876000h",
        });
        if (banError) {
          return json({ error: banError.message || "Couldn't ban auth user" }, 500);
        }
      }

      return json({ ok: true, userId: targetId, isActive: body.isActive });
    }

    if (action === "list") {
      const workplaceId = body.workplaceId?.trim();
      if (workplaceId && !isValidUuid(workplaceId)) {
        return json({ error: "Valid workplaceId is required" }, 400);
      }

      let listQuery = admin
        .from("profiles")
        .select(
          "id, email, firstName, lastName, tier, subscribed, accountType, enterpriseTier, createdAt, isActive, deactivatedAt, roleType, workplaceId",
        )
        .neq("roleType", "admin")
        .order("createdAt", { ascending: false })
        .limit(500);

      if (workplaceId) {
        listQuery = listQuery.eq("workplaceId", workplaceId);
      }

      const { data: profiles, error } = await listQuery;

      if (error) return json({ error: error.message }, 500);

      const ids = (profiles ?? []).map((p) => p.id as string);
      const { data: subs } = ids.length
        ? await admin.from("userSubscription").select("userId, planTier, status").in("userId", ids)
        : { data: [] };

      const subByUser = new Map(
        (subs ?? []).map((s) => [s.userId as string, s]),
      );

      const search = (body.search ?? "").trim().toLowerCase();
      const typeFilter = body.typeFilter ?? "all";
      const statusFilter = body.statusFilter ?? "all";

      const users = (profiles ?? [])
        .map((p) => {
          const sub = subByUser.get(p.id as string);
          const type = resolveAdminUserType({
            accountType: p.accountType as string | null,
            enterpriseTier: p.enterpriseTier as string | null,
            tier: p.tier as string | null,
            subscribed: p.subscribed as boolean | null,
            subscriptionStatus: sub?.status as string | null,
            subscriptionPlanTier: sub?.planTier as string | null,
          });
          const isActive = p.isActive !== false;
          return {
            userId: p.id as string,
            name: displayName(
              p.firstName as string | null,
              p.lastName as string | null,
              p.email as string | null,
            ),
            email: (p.email as string | null) ?? null,
            type,
            dateJoined: (p.createdAt as string | null) ?? null,
            status: isActive ? ("Active" as const) : ("Deactivated" as const),
            isActive,
          };
        })
        .filter((u) => {
          if (statusFilter === "active" && !u.isActive) return false;
          if (statusFilter === "deactivated" && u.isActive) return false;
          if (typeFilter !== "all" && u.type !== typeFilter) return false;
          if (!search) return true;
          return (
            u.name.toLowerCase().includes(search) ||
            (u.email ?? "").toLowerCase().includes(search)
          );
        });

      return json({ ok: true, users });
    }

    // action === "get"
    const targetId = body.userId?.trim();
    if (!targetId || !isValidUuid(targetId)) {
      return json({ error: "Valid userId is required" }, 400);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select(
        "id, email, firstName, lastName, tier, subscribed, accountType, enterpriseTier, enrollmentDate, workplaceId, createdAt, isActive, deactivatedAt, roleType, roleTypes, primaryPillar, behavioralFingerprint, results, onboardingData, timeZone, ageRange, careerStage, genderIdentity, employmentStatus, industry, companySize, workEnvironment, managesATeam, relationshipStatus, parentingStatus, stateRegion",
      )
      .eq("id", targetId)
      .maybeSingle();

    if (profileError) return json({ error: profileError.message }, 500);
    if (!profile) return json({ error: "User not found" }, 404);

    const { data: sub } = await admin
      .from("userSubscription")
      .select("planTier, status, currentPeriodEnd, cancelAtPeriodEnd")
      .eq("userId", targetId)
      .maybeSingle();

    const type = resolveAdminUserType({
      accountType: profile.accountType as string | null,
      enterpriseTier: profile.enterpriseTier as string | null,
      tier: profile.tier as string | null,
      subscribed: profile.subscribed as boolean | null,
      subscriptionStatus: sub?.status as string | null,
      subscriptionPlanTier: sub?.planTier as string | null,
    });

    const [
      enrollmentsRes,
      coachBookingsRes,
      groupBookingsRes,
      creditsRes,
      creditLedgerRes,
      assessmentsRes,
      crisisRes,
      journalRes,
      chatRes,
    ] = await Promise.all([
      admin
        .from("pathEnrollment")
        .select("id, pathId, status, createdAt, completedSessionsCount, currentSessionId")
        .eq("userId", targetId)
        .order("createdAt", { ascending: false }),
      admin
        .from("coachBooking")
        .select("id, status, scheduledAt, createdAt", { count: "exact" })
        .eq("userId", targetId)
        .order("createdAt", { ascending: false })
        .limit(50),
      admin
        .from("groupSessionBooking")
        .select("id, status, createdAt", { count: "exact" })
        .eq("userId", targetId)
        .order("createdAt", { ascending: false })
        .limit(50),
      admin.rpc("available_premium_credits", { p_user_id: targetId }),
      admin
        .from("premiumCreditLedger")
        .select("id, delta, reason, note, createdAt, coachBookingId, stripeInvoiceId")
        .eq("userId", targetId)
        .order("createdAt", { ascending: false })
        .limit(50),
      admin
        .from("assessmentResult")
        .select(
          "id, isInitial, assessmentDate, classification, trajectoryType, stabilityScore, performanceScore, alignmentScore",
        )
        .eq("userId", targetId)
        .order("assessmentDate", { ascending: false })
        .limit(20),
      admin
        .from("coachingSessionArchive")
        .select("id, hadCrisisEscalation, finalizedAt")
        .eq("userId", targetId)
        .eq("hadCrisisEscalation", true)
        .limit(1),
      admin
        .from("journalEntry")
        .select("id, createdAt")
        .eq("userId", targetId)
        .order("createdAt", { ascending: false })
        .limit(1),
      admin
        .from("coachingSessionArchive")
        .select("id, finalizedAt, sessionType")
        .eq("userId", targetId)
        .order("finalizedAt", { ascending: false })
        .limit(1),
    ]);

    const pathIds = [
      ...new Set(
        (enrollmentsRes.data ?? [])
          .map((e) => e.pathId as string | null)
          .filter((id): id is string => !!id),
      ),
    ];
    const { data: paths } = pathIds.length
      ? await admin.from("path").select("id, name, tier").in("id", pathIds)
      : { data: [] };
    const pathById = new Map((paths ?? []).map((p) => [p.id as string, p]));

    const results = (profile.results && typeof profile.results === "object"
      ? profile.results
      : {}) as Record<string, unknown>;
    const onboardingData = (profile.onboardingData && typeof profile.onboardingData === "object"
      ? profile.onboardingData
      : {}) as Record<string, unknown>;
    const healthFlags =
      onboardingData.healthFlags && typeof onboardingData.healthFlags === "object"
        ? (onboardingData.healthFlags as Record<string, unknown>)
        : {};

    const griefModeActive =
      healthFlags.grief_mode_active === true || results.grief_mode_active === true;
    const recoveryModeActive =
      healthFlags.recovery_mode_active === true || results.recovery_mode_active === true;

    const fingerprint =
      typeof profile.behavioralFingerprint === "string"
        ? profile.behavioralFingerprint.trim()
        : "";

    const lastJournalAt = journalRes.data?.[0]?.createdAt as string | undefined;
    const lastChatAt = chatRes.data?.[0]?.finalizedAt as string | undefined;
    const lastCoachAt = (coachBookingsRes.data ?? [])
      .map((b) => (b.scheduledAt || b.createdAt) as string | null)
      .filter(Boolean)
      .sort()
      .at(-1);

    const isActive = profile.isActive !== false;

    return json({
      ok: true,
      user: {
        userId: profile.id,
        name: displayName(
          profile.firstName as string | null,
          profile.lastName as string | null,
          profile.email as string | null,
        ),
        email: profile.email ?? null,
        firstName: profile.firstName ?? null,
        lastName: profile.lastName ?? null,
        type,
        dateJoined: profile.createdAt ?? null,
        status: isActive ? "Active" : "Deactivated",
        isActive,
        deactivatedAt: profile.deactivatedAt ?? null,
        accountType: profile.accountType ?? "individual",
        customerRoleType: (() => {
          const roles = Array.isArray(profile.roleTypes)
            ? (profile.roleTypes as string[]).filter((r) => r && r !== "admin")
            : [];
          if (roles.length > 0) return roles.join(", ");
          const single = typeof profile.roleType === "string" ? profile.roleType.trim() : "";
          return single && single !== "admin" ? single : null;
        })(),
        primaryPillar:
          typeof profile.primaryPillar === "string" && profile.primaryPillar.trim()
            ? profile.primaryPillar.trim()
            : null,
        enterpriseTier: profile.enterpriseTier ?? null,
        enrollmentDate: profile.enrollmentDate ?? null,
        workplaceId: profile.workplaceId ?? null,
        timezone: profile.timeZone ?? null,
        aboutYou: {
          ageRange: profile.ageRange ?? null,
          careerStage: profile.careerStage ?? null,
          genderIdentity: profile.genderIdentity ?? null,
          employmentStatus: profile.employmentStatus ?? null,
          industry: profile.industry ?? null,
          companySize: profile.companySize ?? null,
          workEnvironment: profile.workEnvironment ?? null,
          managesATeam: profile.managesATeam ?? null,
          relationshipStatus: profile.relationshipStatus ?? null,
          parentingStatus: profile.parentingStatus ?? null,
          stateRegion: profile.stateRegion ?? null,
        },
        subscription: sub
          ? {
              planTier: sub.planTier,
              status: sub.status,
              currentPeriodEnd: sub.currentPeriodEnd,
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            }
          : null,
        paths: (enrollmentsRes.data ?? []).map((e) => {
          const path = pathById.get(e.pathId as string);
          return {
            enrollmentId: e.id,
            pathId: e.pathId,
            pathName: path?.name ?? "Unknown path",
            tier: path?.tier ?? null,
            status: e.status,
            createdAt: e.createdAt,
            completedSessionsCount: e.completedSessionsCount ?? 0,
            currentSessionId: e.currentSessionId ?? null,
          };
        }),
        bookings: {
          oneOnOne: coachBookingsRes.count ?? coachBookingsRes.data?.length ?? 0,
          group: groupBookingsRes.count ?? groupBookingsRes.data?.length ?? 0,
        },
        sessionLogs: {
          oneOnOne: (coachBookingsRes.data ?? []).map((row) => ({
            id: row.id as string,
            kind: "one_on_one" as const,
            status: (row.status as string | null) ?? null,
            scheduledAt: (row.scheduledAt as string | null) ?? null,
            createdAt: (row.createdAt as string | null) ?? null,
          })),
          group: (groupBookingsRes.data ?? []).map((row) => ({
            id: row.id as string,
            kind: "group" as const,
            status: (row.status as string | null) ?? null,
            scheduledAt: null,
            createdAt: (row.createdAt as string | null) ?? null,
          })),
        },
        creditsBalance: typeof creditsRes.data === "number" ? creditsRes.data : 0,
        creditLedger: (creditLedgerRes.data ?? []).map((row) => ({
          id: row.id as string,
          delta: row.delta as number,
          reason: row.reason as string,
          note: (row.note as string | null) ?? null,
          createdAt: row.createdAt as string,
          coachBookingId: (row.coachBookingId as string | null) ?? null,
          stripeInvoiceId: (row.stripeInvoiceId as string | null) ?? null,
        })),
        assessments: assessmentsRes.data ?? [],
        fingerprintStatus: fingerprint
          ? { present: true, summary: fingerprint.slice(0, 120) }
          : { present: false, summary: null },
        crisisTriggered: (crisisRes.data?.length ?? 0) > 0,
        griefModeActive,
        recoveryModeActive,
        activity: {
          lastJournalAt: lastJournalAt ?? null,
          lastChatSessionAt: lastChatAt ?? null,
          lastCoachBookingAt: lastCoachAt ?? null,
          journaling: !!lastJournalAt,
          chatting: !!lastChatAt,
          sessions: !!lastCoachAt || (enrollmentsRes.data?.length ?? 0) > 0,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
