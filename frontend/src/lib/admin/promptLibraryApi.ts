import { supabase } from "@/integrations/supabase/client";

export type PromptLibraryVersion = {
  id: string;
  status: "draft" | "approved" | "production";
  label: string;
  approvedAt?: string | null;
  promotedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PromptLibraryLayer = {
  layerKey: string;
  content: string;
  sortOrder: number;
};

type PromptLibraryResponse = {
  ok?: boolean;
  error?: string;
  versions?: PromptLibraryVersion[];
  layers?: PromptLibraryLayer[];
  layerKeys?: string[];
  version?: PromptLibraryVersion;
  testRun?: { id: string; versionId: string; runAt: string; flaggedCount: number };
  productionVersionId?: string;
};

async function invokePromptLibrary(body: Record<string, unknown>): Promise<PromptLibraryResponse> {
  const { data, error } = await supabase.functions.invoke("prompt-library", { body });
  if (error) throw error;
  return (data ?? {}) as PromptLibraryResponse;
}

export async function listPromptLibraryVersions(versionId?: string) {
  const payload = await invokePromptLibrary({ action: "listVersions", versionId });
  if (!payload.ok) throw new Error(payload.error ?? "Failed to list prompt library versions");
  return payload;
}

export async function createPromptLibraryDraft(label?: string) {
  const payload = await invokePromptLibrary({ action: "createDraft", label });
  if (!payload.ok || !payload.version) {
    throw new Error(payload.error ?? "Failed to create draft");
  }
  return payload.version;
}

export async function updatePromptLibraryLayer(params: {
  versionId: string;
  layerKey: string;
  content: string;
}) {
  const payload = await invokePromptLibrary({ action: "updateLayer", ...params });
  if (!payload.ok) throw new Error(payload.error ?? "Failed to update layer");
}

export async function savePromptLibraryTestRun(params: {
  versionId: string;
  resultsJson: unknown;
  flaggedCount: number;
}) {
  const payload = await invokePromptLibrary({ action: "saveTestRun", ...params });
  if (!payload.ok || !payload.testRun) {
    throw new Error(payload.error ?? "Failed to save test run");
  }
  return payload.testRun;
}

export async function approvePromptLibraryVersion(params: {
  versionId: string;
  testRunId: string;
  notes?: string;
  overrideReason?: string;
}) {
  const payload = await invokePromptLibrary({ action: "approve", ...params });
  if (!payload.ok) throw new Error(payload.error ?? "Failed to approve version");
}

export async function promotePromptLibraryVersion(versionId: string) {
  const payload = await invokePromptLibrary({ action: "promote", versionId });
  if (!payload.ok) throw new Error(payload.error ?? "Failed to promote version");
  return payload.productionVersionId ?? versionId;
}
