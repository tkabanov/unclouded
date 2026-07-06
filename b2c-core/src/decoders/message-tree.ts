import { isRecord } from "../utils/index.js";
import type { JsonValue } from "../types.js";
import {
  accessorRefToJson,
  decodeAccessor,
  sourceObservedRuntimeAccessorCatalog,
  type AccessorRefKind,
} from "./accessor.js";

export type MessageTreeKnownOp =
  | "TextExpression"
  | "GetDataFromAPI"
  | "GetElement"
  | "GetParamFromUrl"
  | "PreviousStep"
  | "Search"
  | "ElementParent"
  | "CurrentUser"
  | "CurrentPageItem"
  | "APIEventParameter"
  | "OptionValue"
  | "OneOptionValue"
  | "AllOptionValue"
  | "PageData"
  | "Empty"
  | "ArbitraryText"
  | "Message"
  | "InjectedValue"
  | "ThisElement"
  | "CurrentWorkflowItem";

export type MessageTreeNode =
  | { kind: "literal"; value: string | number | boolean | null }
  | { kind: "list"; items: MessageTreeNode[] }
  | { kind: "object"; fields: Record<string, MessageTreeNode> }
  | { kind: "accessor"; name: string; source_type: string | null }
  | { kind: "operation"; op: MessageTreeKnownOp; args: MessageTreeNode[]; source_type: string }
  | { kind: "unknown"; reason: string; source_type: string | null };

export interface DecodeMessageTreeOptions {
  strict?: boolean;
  runtimeAccessorCatalog?: ReadonlySet<string> | readonly string[] | null;
  customNameToId?: Record<string, JsonValue> | null;
}

export type MessageTreeTypedAstNode =
  | { kind: "literal"; value: string | number | boolean | null }
  | { kind: "list"; items: MessageTreeTypedAstNode[] }
  | { kind: "object"; fields: Record<string, MessageTreeTypedAstNode> }
  | { kind: "accessor"; accessor: ReturnType<typeof accessorRefToJson> }
  | {
      kind: "operation";
      op: MessageTreeKnownOp;
      source_type: string;
      args: MessageTreeTypedAstNode[];
    };

export interface MessageTreeAstCoverage {
  schema: "b2c.message_tree_ast_coverage.v1";
  node_count: number;
  max_depth: number;
  operation_count: number;
  accessor_count: number;
  literal_count: number;
  list_count: number;
  object_count: number;
  unknown_node_count: number;
  op_counts: Record<string, number>;
  accessor_kind_counts: Record<AccessorRefKind, number>;
}

const KNOWN_OPS = new Set<MessageTreeKnownOp>([
  "TextExpression",
  "GetDataFromAPI",
  "GetElement",
  "GetParamFromUrl",
  "PreviousStep",
  "Search",
  "ElementParent",
  "CurrentUser",
  "CurrentPageItem",
  "APIEventParameter",
  "OptionValue",
  "OneOptionValue",
  "AllOptionValue",
  "PageData",
  "Empty",
  "ArbitraryText",
  "Message",
  "InjectedValue",
  "ThisElement",
  "CurrentWorkflowItem",
]);

function decodeNode(value: unknown, strict: boolean, options: DecodeMessageTreeOptions): MessageTreeNode {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { kind: "literal", value };
  }

  if (Array.isArray(value)) {
    return {
      kind: "list",
      items: value.map((item) => decodeNode(item, strict, options)),
    };
  }

  if (!isRecord(value)) {
    if (strict && value !== undefined) {
      throw new Error("Malformed message-tree node: non-object value");
    }
    return { kind: "unknown", reason: "non-json-object", source_type: null };
  }

  const sourceType = typeof value.type === "string" ? value.type : null;
  const accessorName = typeof value.name === "string" ? value.name : null;

  if (sourceType) {
    if (!KNOWN_OPS.has(sourceType as MessageTreeKnownOp)) {
      if (strict) {
        throw new Error(`Unknown message-tree op: ${sourceType}`);
      }
      return {
        kind: "unknown",
        reason: `unknown-op:${sourceType}`,
        source_type: sourceType,
      };
    }
    const args: MessageTreeNode[] = [];
    if (sourceType === "Message") {
      if (!accessorName) {
        if (strict) {
          throw new Error("Malformed Message node: name is required");
        }
      } else {
        if (strict) {
          decodeAccessor(accessorName, {
            runtimeAccessorCatalog: options.runtimeAccessorCatalog ?? sourceObservedRuntimeAccessorCatalog(),
            strict: true,
          });
        }
        args.push({
          kind: "accessor",
          name: accessorName,
          source_type: sourceType,
        });
      }
    }
    for (const [key, child] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
      if (key === "type" || key === "name") {
        continue;
      }
      if (
        strict &&
        (sourceType === "Message" || sourceType === "InjectedValue") &&
        key === "next" &&
        child !== null &&
        !Array.isArray(child) &&
        !isRecord(child)
      ) {
        throw new Error(`Malformed ${sourceType} node: next must be object/array/null`);
      }
      args.push(decodeNode(child, strict, options));
    }
    return {
      kind: "operation",
      op: sourceType as MessageTreeKnownOp,
      args,
      source_type: sourceType,
    };
  }

  if (accessorName) {
    return {
      kind: "accessor",
      name: accessorName,
      source_type: sourceType,
    };
  }

  const fields: Record<string, MessageTreeNode> = {};
  for (const key of Object.keys(value).sort((a, b) => a.localeCompare(b))) {
    fields[key] = decodeNode(value[key], strict, options);
  }
  return { kind: "object", fields };
}

function collectAccessorNames(node: MessageTreeNode, out: Set<string>): void {
  if (node.kind === "accessor") {
    out.add(node.name);
    return;
  }
  if (node.kind === "list") {
    for (const item of node.items) {
      collectAccessorNames(item, out);
    }
    return;
  }
  if (node.kind === "object") {
    for (const child of Object.values(node.fields)) {
      collectAccessorNames(child, out);
    }
    return;
  }
  if (node.kind === "operation") {
    for (const child of node.args) {
      collectAccessorNames(child, out);
    }
  }
}

export function decodeMessageTree(rawValue: unknown, options: DecodeMessageTreeOptions = {}): MessageTreeNode {
  return decodeNode(rawValue, options.strict === true, options);
}

export function decodeMessageTreeAccessors(rawValue: unknown, options: DecodeMessageTreeOptions = {}): string[] {
  const decoded = decodeMessageTree(rawValue, options);
  const names = new Set<string>();
  collectAccessorNames(decoded, names);
  return [...names].sort((a, b) => a.localeCompare(b));
}

function toTypedAstNode(node: MessageTreeNode, options: DecodeMessageTreeOptions): MessageTreeTypedAstNode {
  if (node.kind === "literal") {
    return { kind: "literal", value: node.value };
  }
  if (node.kind === "list") {
    return {
      kind: "list",
      items: node.items.map((item) => toTypedAstNode(item, options)),
    };
  }
  if (node.kind === "object") {
    const fields: Record<string, MessageTreeTypedAstNode> = {};
    for (const [key, value] of Object.entries(node.fields)) {
      fields[key] = toTypedAstNode(value, options);
    }
    return { kind: "object", fields };
  }
  if (node.kind === "accessor") {
    const accessor = decodeAccessor(node.name, {
      customNameToId: options.customNameToId ?? null,
      runtimeAccessorCatalog: options.runtimeAccessorCatalog ?? sourceObservedRuntimeAccessorCatalog(),
      strict: options.strict === true,
    });
    return {
      kind: "accessor",
      accessor: accessorRefToJson(accessor),
    };
  }
  if (node.kind === "operation") {
    return {
      kind: "operation",
      op: node.op,
      source_type: node.source_type,
      args: node.args.map((child) => toTypedAstNode(child, options)),
    };
  }
  if (options.strict) {
    throw new Error(`Unknown message-tree node kind: ${node.kind}`);
  }
  return {
    kind: "object",
    fields: {
      unsupported: {
        kind: "literal",
        value: `unknown:${node.reason}`,
      },
    },
  };
}

export function decodeMessageTreeTypedAst(
  rawValue: unknown,
  options: DecodeMessageTreeOptions = {},
): MessageTreeTypedAstNode {
  const decoded = decodeMessageTree(rawValue, options);
  return toTypedAstNode(decoded, options);
}

export function summarizeMessageTreeAstCoverage(ast: MessageTreeTypedAstNode): MessageTreeAstCoverage {
  const opCounts = new Map<string, number>();
  const accessorKindCounts = new Map<AccessorRefKind, number>();
  let nodeCount = 0;
  let maxDepth = 0;
  let operationCount = 0;
  let accessorCount = 0;
  let literalCount = 0;
  let listCount = 0;
  let objectCount = 0;
  let unknownNodeCount = 0;

  const walk = (node: MessageTreeTypedAstNode, depth: number): void => {
    nodeCount += 1;
    maxDepth = Math.max(maxDepth, depth);
    switch (node.kind) {
      case "literal":
        literalCount += 1;
        return;
      case "list":
        listCount += 1;
        for (const item of node.items) {
          walk(item, depth + 1);
        }
        return;
      case "object":
        objectCount += 1;
        for (const child of Object.values(node.fields)) {
          walk(child, depth + 1);
        }
        return;
      case "accessor": {
        accessorCount += 1;
        const kind = node.accessor.kind;
        if (typeof kind === "string") {
          accessorKindCounts.set(kind as AccessorRefKind, (accessorKindCounts.get(kind as AccessorRefKind) ?? 0) + 1);
          if (kind === "unknown") {
            unknownNodeCount += 1;
          }
        } else {
          unknownNodeCount += 1;
        }
        return;
      }
      case "operation":
        operationCount += 1;
        opCounts.set(node.op, (opCounts.get(node.op) ?? 0) + 1);
        for (const child of node.args) {
          walk(child, depth + 1);
        }
        return;
      default:
        unknownNodeCount += 1;
    }
  };

  walk(ast, 1);

  const normalizedAccessorKinds: AccessorRefKind[] = [
    "external_api_field",
    "privacy_role_option",
    "custom_name_lookup",
    "custom_state_ref",
    "bubble_runtime_accessor",
    "unknown",
  ];

  return {
    schema: "b2c.message_tree_ast_coverage.v1",
    node_count: nodeCount,
    max_depth: maxDepth,
    operation_count: operationCount,
    accessor_count: accessorCount,
    literal_count: literalCount,
    list_count: listCount,
    object_count: objectCount,
    unknown_node_count: unknownNodeCount,
    op_counts: Object.fromEntries([...opCounts.entries()].sort(([left], [right]) => left.localeCompare(right))),
    accessor_kind_counts: Object.fromEntries(
      normalizedAccessorKinds.map((kind) => [kind, accessorKindCounts.get(kind) ?? 0]),
    ) as Record<AccessorRefKind, number>,
  };
}
