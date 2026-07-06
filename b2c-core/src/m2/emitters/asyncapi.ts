import type { EmittedArtifact } from "./gherkin.js";
import type { M2ViewBundle } from "../contracts/view-ir.js";

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sanitizeChannel(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "_");
}

interface ExternalCallParts {
  namespaceId: string;
  callId: string;
}

export function parseExternalCallSourceId(sourceId: string): ExternalCallParts {
  const prefix = "external_call:";
  if (!sourceId.startsWith(prefix)) {
    return { namespaceId: "unknown", callId: sourceId };
  }
  const remainder = sourceId.slice(prefix.length);
  const separator = remainder.indexOf(":");
  if (separator <= 0 || separator >= remainder.length - 1) {
    return { namespaceId: "unknown", callId: sourceId };
  }
  return {
    namespaceId: remainder.slice(0, separator),
    callId: remainder.slice(separator + 1),
  };
}

export function asyncApiChannelForNamespace(namespaceId: string): string {
  return `stream/${sanitizeChannel(namespaceId)}`;
}

export function emitAsyncApiScaffold(views: M2ViewBundle): EmittedArtifact[] {
  const channelMessages = new Map<string, string[]>();
  const channelMetadata = new Map<string, { namespaceId: string }>();
  const messages: Record<
    string,
    {
      name: string;
      title: string;
      summary: string;
      payload: { type: string };
      "x-b2c": {
        source_id: string;
        source_kind: "external_http_call";
        stream: true;
        source_namespace_id: string;
        source_call_id: string;
      };
    }
  > = {};
  for (const message of views.asyncapi_messages) {
    const parsed = parseExternalCallSourceId(message.source_id);
    const channel = asyncApiChannelForNamespace(parsed.namespaceId);
    const currentMessages = channelMessages.get(channel) ?? [];
    currentMessages.push(message.message_id);
    channelMessages.set(channel, currentMessages);
    channelMetadata.set(channel, { namespaceId: parsed.namespaceId });
    messages[message.message_id] = {
      name: message.message_id,
      title: `Async message for ${message.source_id}`,
      summary: `Stream payload for ${message.source_id}`,
      payload: { type: "object" },
      "x-b2c": {
        source_id: message.source_id,
        source_kind: "external_http_call",
        stream: true,
        source_namespace_id: parsed.namespaceId,
        source_call_id: parsed.callId,
      },
    };
  }
  const channels: Record<string, { messages: string[]; description: string; "x-b2c": { source_namespace_id: string } }> = {};
  for (const channel of [...channelMessages.keys()].sort((a, b) => a.localeCompare(b))) {
    const metadata = channelMetadata.get(channel);
    const messageIds = [...(channelMessages.get(channel) ?? [])].sort((a, b) => a.localeCompare(b));
    channels[channel] = {
      messages: messageIds,
      description: `Deterministic stream channel for namespace ${metadata?.namespaceId ?? "unknown"}`,
      "x-b2c": {
        source_namespace_id: metadata?.namespaceId ?? "unknown",
      },
    };
  }
  const document = {
    asyncapi: "3.0.0",
    info: {
      title: "M2 Streaming Baseline",
      version: "0.1.0-m2-baseline",
    },
    "x-b2c": {
      generated_from: "inventory+views",
      message_count: views.asyncapi_messages.length,
    },
    channels,
    components: {
      messages,
    },
  };
  return [
    {
      path: "agent/contracts/asyncapi.json",
      content: stableJson(document),
    },
  ];
}
