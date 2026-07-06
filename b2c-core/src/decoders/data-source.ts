import { getString, isRecord } from "../utils/index.js";

export type DataSourceKind =
  | "parent_data"
  | "search"
  | "option_set_value"
  | "current_user"
  | "current_page_item"
  | "element_ref"
  | "this_element"
  | "current_workflow_item"
  | "arbitrary_text"
  | "url_param"
  | "previous_step"
  | "api_result"
  | "external_api_result"
  | "api_event_param"
  | "opaque_scalar"
  | "unknown";

export interface DataSourceDecodeResult {
  kind: DataSourceKind;
  sourceType: string | null;
  isUnknown: boolean;
}

const DIRECT_KIND_BY_TYPE: Record<
  string,
  Exclude<DataSourceKind, "api_result" | "external_api_result" | "opaque_scalar" | "unknown">
> = {
  ElementParent: "parent_data",
  Search: "search",
  AllOptionValue: "option_set_value",
  OneOptionValue: "option_set_value",
  OptionValue: "option_set_value",
  CurrentUser: "current_user",
  CurrentPageItem: "current_page_item",
  GetElement: "element_ref",
  ThisElement: "this_element",
  CurrentWorkflowItem: "current_workflow_item",
  ArbitraryText: "arbitrary_text",
  GetParamFromUrl: "url_param",
  PreviousStep: "previous_step",
  APIEventParameter: "api_event_param",
};

function containsMessageNameWithPrefix(value: unknown, prefix: string): boolean {
  if (Array.isArray(value)) {
    return value.some((child) => containsMessageNameWithPrefix(child, prefix));
  }
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.name === "string" && value.name.startsWith(prefix)) {
    return true;
  }
  return Object.values(value).some((child) => containsMessageNameWithPrefix(child, prefix));
}

export function decodeDataSource(rawValue: unknown): DataSourceDecodeResult {
  if (typeof rawValue === "number" || typeof rawValue === "boolean" || rawValue === null) {
    return {
      kind: "opaque_scalar",
      sourceType: null,
      isUnknown: false,
    };
  }
  if (!isRecord(rawValue)) {
    return {
      kind: "unknown",
      sourceType: null,
      isUnknown: true,
    };
  }
  const sourceType = getString(rawValue.type);
  if (!sourceType) {
    return {
      kind: "unknown",
      sourceType: null,
      isUnknown: true,
    };
  }
  if (sourceType === "GetDataFromAPI") {
    return {
      kind: containsMessageNameWithPrefix(rawValue, "_api_c2_") ? "external_api_result" : "api_result",
      sourceType,
      isUnknown: false,
    };
  }
  const directKind = DIRECT_KIND_BY_TYPE[sourceType];
  if (directKind) {
    return {
      kind: directKind,
      sourceType,
      isUnknown: false,
    };
  }
  return {
    kind: "unknown",
    sourceType,
    isUnknown: true,
  };
}
