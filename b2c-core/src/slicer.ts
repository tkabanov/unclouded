import type { BubbleElement, BubbleRoot, InventoryFile, SliceRecord } from "./types.js";
import { getRecord, getString, toPointer } from "./utils/index.js";

const CONTEXT_BUDGET_TOKENS = 4_000;
const CTX_BUDGET = 80_000;
const SLICE_BUDGET = Math.floor(CTX_BUDGET * 0.6); // 48k
const PAYLOAD_BUDGET = SLICE_BUDGET - CONTEXT_BUDGET_TOKENS; // 44k

function estimateTokens(value: unknown): number {
  const chars = JSON.stringify(value).length;
  return Math.ceil((chars / 4) * 1.1);
}

function valueAtPointer(root: BubbleRoot, pointer: string): unknown {
  const parts = pointer
    .split("/")
    .slice(1)
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  let cursor: unknown = root;
  for (const part of parts) {
    if (Array.isArray(cursor)) {
      const idx = Number(part);
      if (!Number.isInteger(idx)) {
        return undefined;
      }
      cursor = cursor[idx];
      continue;
    }
    const record = getRecord(cursor);
    if (!record) {
      return undefined;
    }
    cursor = record[part];
  }
  return cursor;
}

function idsUnderPointer(inventory: InventoryFile, pointerPrefix: string): string[] {
  const ids = inventory.entries
    .filter((entry) => entry.pointer === pointerPrefix || entry.pointer.startsWith(`${pointerPrefix}/`))
    .map((entry) => entry.id);
  ids.sort();
  return ids;
}

function parentChainForPointer(pointer: string): string[] {
  const parts = pointer.split("/").filter(Boolean);
  const chain: string[] = [];
  if (parts.length < 2) {
    return chain;
  }
  for (let i = parts.length - 1; i >= 1 && chain.length < 3; i -= 2) {
    chain.push(parts[i] ?? "");
  }
  return chain.filter((item) => item.length > 0);
}

function pointerToSlicePath(pointer: string, pageKey: string): string {
  const parts = pointer.split("/").filter(Boolean);
  const pageIdx = parts.findIndex((part) => part === "pages");
  if (pageIdx < 0 || parts[pageIdx + 1] === undefined) {
    return `${pageKey}/__root`;
  }
  const suffix = parts.slice(pageIdx + 2).join("/");
  return suffix.length > 0 ? `${pageKey}/${suffix}` : `${pageKey}/__root`;
}

interface SliceBuildContext {
  root: BubbleRoot;
  inventory: InventoryFile;
  pageKey: string;
  pageEntityId: string;
  pagePointer: string;
  slices: SliceRecord[];
  seq: number;
  elementIdToSlice: Map<string, string>;
}

function pushSlice(
  context: SliceBuildContext,
  slice: Omit<SliceRecord, "slice_seq">,
): void {
  context.seq += 1;
  context.slices.push({
    ...slice,
    slice_seq: context.seq,
  });
}

function splitWorkflows(
  context: SliceBuildContext,
  workflowsPointer: string,
  parentSliceId: string,
): void {
  const workflows = getRecord(valueAtPointer(context.root, workflowsPointer));
  if (!workflows) {
    return;
  }
  const entries = Object.entries(workflows).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    return;
  }

  const chunks: Array<Array<[string, unknown]>> = [];
  let currentChunk: Array<[string, unknown]> = [];
  let currentTokens = 0;
  for (const pair of entries) {
    const token = estimateTokens(pair[1]);
    if (currentChunk.length > 0 && currentTokens + token > PAYLOAD_BUDGET) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokens = 0;
    }
    currentChunk.push(pair);
    currentTokens += token;
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  const partNames = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let index = 0; index < chunks.length; index += 1) {
    const part = chunks[index] ?? [];
    const partObject: Record<string, unknown> = {};
    for (const [key, value] of part) {
      partObject[key] = value;
    }
    const suffix = partNames[index] ?? String(index + 1);
    const sliceId = `${context.pageKey}/workflows/__part_${suffix}`;
    pushSlice(context, {
      slice_id: sliceId,
      parent_slice_id: parentSliceId,
      slice_kind: "sub_workflow_group",
      entity_id: context.pageEntityId,
      pointer: workflowsPointer,
      entities: idsUnderPointer(context.inventory, workflowsPointer),
      tokens_estimate: Math.min(SLICE_BUDGET, estimateTokens(partObject) + 1_800),
      neighbour_context: {
        parent_summary: `Workflow block on page ${context.pageKey}`,
        referenced_ids: [context.pageEntityId],
      },
    });
  }
}

function splitElementGroup(
  context: SliceBuildContext,
  elementsPointer: string,
  parentSliceId: string,
  parentEntityId: string,
): void {
  const elements = getRecord(valueAtPointer(context.root, elementsPointer)) as
    | Record<string, BubbleElement>
    | undefined;
  if (!elements) {
    return;
  }
  const entries = Object.entries(elements).sort(([a], [b]) => a.localeCompare(b));
  const largeChildren: Array<[string, BubbleElement]> = [];
  const smallChildren: Array<[string, BubbleElement]> = [];
  for (const [key, value] of entries) {
    const tokens = estimateTokens(value);
    if (tokens > PAYLOAD_BUDGET) {
      largeChildren.push([key, value]);
    } else {
      smallChildren.push([key, value]);
    }
  }

  if (smallChildren.length > 0) {
    const groupedObject: Record<string, BubbleElement> = {};
    for (const [key, value] of smallChildren) {
      groupedObject[key] = value;
      const elementId = value.id ?? key;
      context.elementIdToSlice.set(
        elementId,
        `${pointerToSlicePath(elementsPointer, context.pageKey)}/__remaining_children`,
      );
    }
    const sliceId = `${pointerToSlicePath(elementsPointer, context.pageKey)}/__remaining_children`;
    pushSlice(context, {
      slice_id: sliceId,
      parent_slice_id: parentSliceId,
      slice_kind: "sub_element_group",
      entity_id: parentEntityId,
      pointer: elementsPointer,
      entities: idsUnderPointer(context.inventory, elementsPointer),
      tokens_estimate: Math.min(SLICE_BUDGET, estimateTokens(groupedObject) + 2_400),
      neighbour_context: {
        parent_summary: `Element group under ${parentEntityId}`,
        referenced_ids: [context.pageEntityId, parentEntityId],
      },
    });
  }

  for (const [childKey, childValue] of largeChildren) {
    const childPointer = `${elementsPointer}/${childKey}`;
    const childId = childValue.id ?? childKey;
    const childSliceId = pointerToSlicePath(childPointer, context.pageKey);
    context.elementIdToSlice.set(childId, childSliceId);

    const childElementsPointer = `${childPointer}/elements`;
    const childElements = getRecord(valueAtPointer(context.root, childElementsPointer));
    if (childElements && estimateTokens(childValue) > PAYLOAD_BUDGET) {
      splitElementGroup(context, childElementsPointer, parentSliceId, childId);
      continue;
    }

    pushSlice(context, {
      slice_id: childSliceId,
      parent_slice_id: parentSliceId,
      slice_kind: "sub_element_group",
      entity_id: childId,
      pointer: childPointer,
      entities: idsUnderPointer(context.inventory, childPointer),
      tokens_estimate: Math.min(SLICE_BUDGET, estimateTokens(childValue) + 2_400),
      neighbour_context: {
        parent_summary: `Element ${childId} nested in page ${context.pageKey}`,
        referenced_ids: [context.pageEntityId, parentEntityId],
      },
    });
  }
}

function annotateWorkflowTriggerEnvelope(context: SliceBuildContext): void {
  for (const slice of context.slices) {
    if (slice.slice_kind !== "sub_workflow_group") {
      continue;
    }
    const workflows = getRecord(valueAtPointer(context.root, slice.pointer));
    if (!workflows) {
      continue;
    }
    for (const workflow of Object.values(workflows)) {
      const wfRecord = getRecord(workflow);
      if (!wfRecord) {
        continue;
      }
      const properties = getRecord(wfRecord.properties);
      const triggerElementId = getString(properties?.element_id);
      if (!triggerElementId) {
        continue;
      }
      const targetSlice = context.elementIdToSlice.get(triggerElementId);
      if (!targetSlice || targetSlice === slice.slice_id) {
        continue;
      }

      const elementEntry = context.inventory.entries.find((entry) => entry.id === triggerElementId);
      const elementPointer = elementEntry?.pointer ?? "";
      const elementValue = elementPointer
        ? getRecord(valueAtPointer(context.root, elementPointer))
        : undefined;

      slice.neighbour_context = {
        parent_summary:
          slice.neighbour_context?.parent_summary ??
          `Workflow block on page ${context.pageKey}`,
        referenced_ids: Array.from(
          new Set([
            ...(slice.neighbour_context?.referenced_ids ?? []),
            context.pageEntityId,
            triggerElementId,
          ]),
        ),
        trigger_envelope: {
          pointer: elementPointer,
          element_type: getString(elementValue?.type) ?? "Unknown",
          custom_state_keys: Object.keys(getRecord(elementValue?.custom_states) ?? {}),
          parent_chain: parentChainForPointer(elementPointer).slice(0, 3),
        },
      };
      break;
    }
  }
}

function buildPageSlices(
  root: BubbleRoot,
  inventory: InventoryFile,
  pageEntityId: string,
  pageKey: string,
  pagePointer: string,
): SliceRecord[] {
  const pageValue = valueAtPointer(root, pagePointer);
  const rootTokens = estimateTokens(pageValue);
  const context: SliceBuildContext = {
    root,
    inventory,
    pageKey,
    pageEntityId,
    pagePointer,
    slices: [],
    seq: 0,
    elementIdToSlice: new Map<string, string>(),
  };

  const rootSliceId = `${pageKey}/__root`;
  const rootEntities = idsUnderPointer(inventory, pagePointer);

  if (rootTokens <= SLICE_BUDGET) {
    pushSlice(context, {
      slice_id: rootSliceId,
      slice_kind: "root",
      entity_id: pageEntityId,
      pointer: pagePointer,
      entities: rootEntities,
      tokens_estimate: rootTokens,
    });
    return context.slices;
  }

  const pageRecord = getRecord(pageValue) ?? {};
  const rootPayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(pageRecord)) {
    if (key === "elements" || key === "workflows") {
      continue;
    }
    rootPayload[key] = value;
  }

  pushSlice(context, {
    slice_id: rootSliceId,
    slice_kind: "root",
      entity_id: pageEntityId,
    pointer: pagePointer,
    entities: rootEntities,
    tokens_estimate: Math.min(SLICE_BUDGET, estimateTokens(rootPayload) + 1_200),
    neighbour_context: {
      parent_summary: `Page root ${pageKey}`,
      referenced_ids: [pageEntityId],
    },
  });

  splitWorkflows(context, `${pagePointer}/workflows`, rootSliceId);
  splitElementGroup(context, `${pagePointer}/elements`, rootSliceId, pageEntityId);
  annotateWorkflowTriggerEnvelope(context);

  return context.slices;
}

export function buildSlices(root: BubbleRoot, inventory: InventoryFile): SliceRecord[] {
  const pageEntries = inventory.entries.filter((entry) => entry.entity_class === "page");
  const slices: SliceRecord[] = [];
  for (const pageEntry of pageEntries) {
    const pageKey = pageEntry.pointer.split("/").filter(Boolean)[1] ?? pageEntry.id;
    const built = buildPageSlices(root, inventory, pageEntry.id, pageKey, pageEntry.pointer);
    slices.push(...built);
  }
  slices.sort((a, b) => {
    if (a.entity_id !== b.entity_id) {
      return a.entity_id.localeCompare(b.entity_id);
    }
    return a.slice_seq - b.slice_seq;
  });

  for (const slice of slices) {
    if (slice.tokens_estimate > SLICE_BUDGET) {
      throw new Error(`Slice budget exceeded for ${slice.slice_id}: ${slice.tokens_estimate}`);
    }
    const contextTokens = slice.neighbour_context ? estimateTokens(slice.neighbour_context) : 0;
    if (contextTokens > CONTEXT_BUDGET_TOKENS) {
      throw new Error(
        `Neighbour context budget exceeded for ${slice.slice_id}: ${contextTokens}`,
      );
    }
  }
  return slices;
}
