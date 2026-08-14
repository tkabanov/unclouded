import { describe, expect, it } from "vitest";

import { getEdgeFunctionErrorMessage } from "./edgeFunctionErrors";

const FALLBACK = "Invalid or inactive enrollment code.";
const SEATS_FULL = "Your organization's seats are full. Contact your HR team.";
const GENERIC_INVOKE = "Edge Function returned a non-2xx status code";

describe("getEdgeFunctionErrorMessage", () => {
  it("prefers data.error when invoke still returns a body", async () => {
    await expect(
      getEdgeFunctionErrorMessage({ ok: false, error: SEATS_FULL }, { message: GENERIC_INVOKE }, FALLBACK),
    ).resolves.toBe(SEATS_FULL);
  });

  it("reads JSON from FunctionsHttpError.context (supabase-js 2.x 409)", async () => {
    const context = new Response(JSON.stringify({ ok: false, error: SEATS_FULL }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });

    await expect(
      getEdgeFunctionErrorMessage(null, { message: GENERIC_INVOKE, context }, FALLBACK),
    ).resolves.toBe(SEATS_FULL);
  });

  it("does not consume the original Response body (clone)", async () => {
    const context = new Response(JSON.stringify({ error: SEATS_FULL }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });

    await expect(
      getEdgeFunctionErrorMessage(null, { message: GENERIC_INVOKE, context }, FALLBACK),
    ).resolves.toBe(SEATS_FULL);

    await expect(context.json()).resolves.toEqual({ error: SEATS_FULL });
  });

  it("falls back when invoke hides a 409 body", async () => {
    await expect(
      getEdgeFunctionErrorMessage(null, { message: GENERIC_INVOKE }, FALLBACK),
    ).resolves.toBe(FALLBACK);
  });
});
