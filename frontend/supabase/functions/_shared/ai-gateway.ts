import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";

/**
 * Connects the AI SDK to the Lovable AI Gateway.
 * The API key is provisioned automatically and must stay server-side.
 */
export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
    },
  });
}
