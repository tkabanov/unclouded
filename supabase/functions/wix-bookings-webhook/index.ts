/**
 * Wix Bookings webhook — confirm/cancel Premium 1:1 sessions and redeem or
 * release credit holds.
 *
 * POST /functions/v1/wix-bookings-webhook
 *
 * Wix delivers event bodies as a JWT string. Set WIX_WEBHOOK_SECRET and send
 * the same value in `X-Wix-Webhook-Secret` when configuring the Wix endpoint.
 *
 * Pass `?bookingId=<uuid>` on the coach booking URL (https://www.provenunderpressure.com/)
 * so pending holds can be matched when contact email alone is ambiguous.
 */
import { getServiceClient, json } from "../_shared/stripeBilling.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wix-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function verifySecret(req: Request): boolean {
  const expected = Deno.env.get("WIX_WEBHOOK_SECRET")?.trim();
  if (!expected) return false;
  const header = req.headers.get("X-Wix-Webhook-Secret")?.trim();
  if (header && header === expected) return true;
  const auth = req.headers.get("Authorization")?.trim();
  if (auth === `Bearer ${expected}`) return true;
  return false;
}

function decodeJwtPayload(raw: string): Record<string, unknown> | null {
  const token = raw.trim();
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonText = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
    const parsed = JSON.parse(jsonText) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readEmailFromObject(obj: Record<string, unknown>): string | null {
  const direct =
    readString(obj.email) ??
    readString(obj.contactEmail) ??
    readString(obj.contact_email);

  if (direct) return direct;

  const contact = obj.contactDetails ?? obj.contact;
  if (contact && typeof contact === "object") {
    const contactObj = contact as Record<string, unknown>;
    return (
      readString(contactObj.email) ??
      readString(contactObj.contactEmail) ??
      readString(contactObj.contact_email)
    );
  }

  const formFields = obj.formFields ?? obj.customFormFields;
  if (formFields && typeof formFields === "object") {
    for (const value of Object.values(formFields as Record<string, unknown>)) {
      if (typeof value === "string" && value.includes("@")) return value.trim();
      if (value && typeof value === "object") {
        const nested = value as Record<string, unknown>;
        const email = readString(nested.value) ?? readString(nested.email);
        if (email?.includes("@")) return email;
      }
    }
  }

  return null;
}

function extractEvent(rawBody: string): {
  eventId: string;
  slug: string;
  wixBookingId: string | null;
  contactEmail: string | null;
  internalBookingId: string | null;
} | null {
  const trimmed = rawBody.trim();
  if (!trimmed) return null;

  let payload: Record<string, unknown> | null = null;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      payload = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      payload = null;
    }
  } else {
    payload = decodeJwtPayload(trimmed);
  }

  if (!payload) return null;

  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;

  const actionEvent =
    data.actionEvent && typeof data.actionEvent === "object"
      ? (data.actionEvent as Record<string, unknown>)
      : data;

  const slug =
    readString(actionEvent.slug) ??
    readString(data.slug) ??
    readString(payload.eventType) ??
    "unknown";

  const eventId =
    readString(payload.id) ??
    readString(actionEvent.id) ??
    readString(data.id) ??
    `${slug}:${readString(actionEvent.entityId) ?? readString(data.entityId) ?? crypto.randomUUID()}`;

  const wixBookingId =
    readString(actionEvent.entityId) ??
    readString(data.entityId) ??
    readString(data.bookingId) ??
    readString(actionEvent.bookingId);

  const body =
    actionEvent.body && typeof actionEvent.body === "object"
      ? (actionEvent.body as Record<string, unknown>)
      : actionEvent;

  const contactEmail = readEmailFromObject(body);

  const internalBookingId =
    readString(body.bookingId) ??
    readString(body.unclouded_booking_id) ??
    readString(body.uncloudedBookingId) ??
    readString(data.unclouded_booking_id);

  return {
    eventId,
    slug,
    wixBookingId,
    contactEmail,
    internalBookingId,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!verifySecret(req)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const rawBody = await req.text();

  let event: ReturnType<typeof extractEvent>;
  try {
    event = extractEvent(rawBody);
  } catch (err) {
    console.error("wix-bookings-webhook parse failed", err);
    return json({ error: "Invalid webhook payload" }, 400);
  }

  if (!event) {
    return json({ error: "Unrecognized webhook payload" }, 400);
  }

  const service = getServiceClient();

  try {
    const { data, error } = await service.rpc("wix_process_coach_booking_event", {
      p_event_id: event.eventId,
      p_event_slug: event.slug,
      p_wix_booking_id: event.wixBookingId,
      p_contact_email: event.contactEmail,
      p_internal_booking_id: event.internalBookingId,
    });

    if (error) {
      console.error("wix_process_coach_booking_event failed", error);
      return json({ error: error.message }, 500);
    }

    const result = (data ?? {}) as Record<string, unknown>;
    if (result.code === "booking_not_found") {
      console.warn("wix-bookings-webhook: booking not found", event);
      return json({ ok: false, ...result }, 404);
    }

    return json({ ok: true, ...result });
  } catch (err) {
    console.error("wix-bookings-webhook failed", err);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
