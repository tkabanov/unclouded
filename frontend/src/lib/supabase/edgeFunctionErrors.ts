type EdgeFunctionErrorBody = {
  error?: unknown;
  message?: unknown;
};

const GENERIC_INVOKE_ERROR = /edge function returned a non-2xx status code/i;

export function getEdgeFunctionErrorMessage(
  data: unknown,
  error: { message?: string } | null | undefined,
  fallback: string,
): string {
  const body = data as EdgeFunctionErrorBody | null;

  if (typeof body?.error === "string" && body.error.trim()) {
    return body.error.trim();
  }

  if (typeof body?.message === "string" && body.message.trim()) {
    return body.message.trim();
  }

  const invokeMessage = error?.message?.trim();
  if (invokeMessage && !GENERIC_INVOKE_ERROR.test(invokeMessage)) {
    return invokeMessage;
  }

  return fallback;
}
