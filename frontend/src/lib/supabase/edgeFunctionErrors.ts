type EdgeFunctionErrorBody = {
  error?: unknown;
  message?: unknown;
};

const GENERIC_INVOKE_ERROR = /edge function returned a non-2xx status code/i;

type InvokeErrorLike = {
  message?: string;
  context?: unknown;
};

function messageFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as EdgeFunctionErrorBody;
  if (typeof rec.error === "string" && rec.error.trim()) return rec.error.trim();
  if (typeof rec.message === "string" && rec.message.trim()) return rec.message.trim();
  return null;
}

function isJsonResponseLike(
  value: unknown,
): value is { json: () => Promise<unknown>; clone?: () => { json: () => Promise<unknown> } } {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { json?: unknown }).json === "function"
  );
}

/**
 * supabase-js 2.x `functions.invoke` on non-2xx: `data` is null and the JSON
 * body lives on `error.context` (a Fetch Response). Official pattern:
 * `await error.context.json()`.
 */
async function messageFromInvokeContext(context: unknown): Promise<string | null> {
  if (context == null) return null;

  const fromParsed = messageFromBody(context);
  if (fromParsed) return fromParsed;

  if (!isJsonResponseLike(context)) return null;

  try {
    const source = typeof context.clone === "function" ? context.clone() : context;
    return messageFromBody(await source.json());
  } catch {
    return null;
  }
}

export async function getEdgeFunctionErrorMessage(
  data: unknown,
  error: InvokeErrorLike | null | undefined,
  fallback: string,
): Promise<string> {
  const fromData = messageFromBody(data);
  if (fromData) return fromData;

  const fromContext = await messageFromInvokeContext(error?.context);
  if (fromContext) return fromContext;

  const invokeMessage = error?.message?.trim();
  if (invokeMessage && !GENERIC_INVOKE_ERROR.test(invokeMessage)) {
    return invokeMessage;
  }

  return fallback;
}
