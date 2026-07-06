export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface BubbleRoot {
  _index?: {
    id_to_path?: Record<string, string>;
    custom_name_to_id?: Record<string, JsonValue>;
  };
  user_types?: Record<string, BubbleUserType>;
  pages?: Record<string, BubblePage>;
  element_definitions?: Record<string, BubbleElementDefinition>;
  option_sets?: Record<string, BubbleOptionSet>;
  styles?: Record<string, JsonValue>;
  mobile_views?: Record<string, JsonValue>;
  api?: Record<string, BubbleApiEvent>;
  settings?: {
    client_safe?: Record<string, JsonValue>;
    secure?: Record<string, JsonValue>;
  };
}

export interface BubbleUserType {
  display?: string;
  fields?: Record<string, BubbleUserTypeField>;
  privacy_role?: Record<string, BubblePrivacyRole>;
}

export interface BubbleUserTypeField {
  display?: string;
  type?: string;
  currency?: string;
  file_settings?: {
    storage_path?: string;
    mime_type?: string;
  };
}

export interface BubblePrivacyRole {
  condition?: JsonValue;
}

export interface BubblePage {
  id?: string;
  name?: string;
  style?: string;
  elements?: Record<string, BubbleElement>;
  workflows?: Record<string, BubbleWorkflow>;
  custom_states?: Record<string, JsonValue>;
}

export interface BubbleElement {
  id?: string;
  type?: string;
  style?: string;
  properties?: Record<string, JsonValue>;
  custom_states?: Record<string, JsonValue>;
  elements?: Record<string, BubbleElement>;
  workflows?: Record<string, BubbleWorkflow>;
}

export interface BubbleElementDefinition {
  id?: string;
  name?: string;
  style?: string;
  properties?: Record<string, JsonValue>;
  fields?: Record<string, JsonValue>;
  states?: Record<string, JsonValue>;
  elements?: Record<string, BubbleElement>;
  workflows?: Record<string, BubbleWorkflow>;
  custom_states?: Record<string, JsonValue>;
}

export interface BubbleWorkflow {
  id?: string;
  type?: string;
  properties?: Record<string, JsonValue>;
  actions?: Record<string, BubbleWorkflowAction>;
}

export interface BubbleWorkflowAction {
  id?: string;
  type?: string;
  properties?: Record<string, JsonValue>;
}

export interface BubbleApiEvent {
  id?: string;
  type?: string;
  properties?: Record<string, JsonValue>;
  actions?: Record<string, BubbleWorkflowAction>;
}

export interface BubbleOptionSet {
  display?: string;
  values?: Record<string, JsonValue>;
}

export type EntityClass =
  | "user_type"
  | "user_type.field"
  | "privacy_role"
  | "page"
  | "element"
  | "workflow"
  | "workflow.action"
  | "api_event"
  | "api_event.action"
  | "option_set"
  | "option_set.value"
  | "style"
  | "style_ref"
  | "element_definition"
  | "element_definition.workflow"
  | "element_definition.action"
  | "element_definition.state"
  | "element_definition.field"
  | "mobile_view"
  | "custom_state"
  | "plugin"
  | "color_token"
  | "font_token"
  | "settings_singleton"
  | "external_http_namespace"
  | "external_http_call"
  | "oauth_namespace"
  | "secret_ref"
  | "public_integration_key"
  | "index_only";

export type ReservedViewClass =
  | "acceptance_scenario"
  | "openapi_operation"
  | "asyncapi_message"
  | "uds_type"
  | "threat_actor"
  | "data_flow"
  | "migration_adr";

export interface InventoryEntry {
  id: string;
  pointer: string;
  entity_class: EntityClass;
  parent_id?: string;
  meta?: Record<string, JsonValue>;
}

export interface InventoryFile {
  entries: InventoryEntry[];
  reserved_view_classes: ReservedViewClass[];
}

export interface SuspiciousPublicIntegrationKeyIssue {
  key: string;
  pointer: string;
  reason: "denylisted_suffix";
  denylist_suffix: string;
  plugin_id_ref?: string;
}

export interface LintFile {
  status: "pass" | "fail";
  suspicious_public_integration_keys: SuspiciousPublicIntegrationKeyIssue[];
}

export interface InventoryBuildResult {
  inventory: InventoryFile;
  lint: LintFile;
}

export interface RefEdge {
  from_id: string;
  to_id: string;
  edge_kind:
    | "style_ref"
    | "custom_state_ref"
    | "data_binding_content_type"
    | "data_binding_custom_state_ref"
    | "external_call_response_field"
    | "external_call_secret"
    | "oauth_user_data_call";
  source_path: string;
}

export interface ResolverEntry {
  id: string;
  display_name: string;
  short_hash: string;
}

export interface ResolverFile {
  entries: ResolverEntry[];
  collisions: Record<string, string[]>;
}

export interface SliceNeighbourContext {
  trigger_envelope?: {
    pointer: string;
    element_type: string;
    custom_state_keys: string[];
    parent_chain: string[];
  };
  parent_summary: string;
  referenced_ids: string[];
}

export interface SliceRecord {
  slice_id: string;
  slice_seq: number;
  parent_slice_id?: string;
  slice_kind: "root" | "sub_workflow_group" | "sub_element_group";
  entity_id: string;
  pointer: string;
  entities: string[];
  tokens_estimate: number;
  neighbour_context?: SliceNeighbourContext;
}

export interface HeaderBudgetFile {
  ctx_budget: number;
  header_budget: number;
  response_budget: number;
  slice_budget: number;
}

export interface DeterministicCoverDraft {
  slice_id: "_deterministic";
  covered_ids: string[];
  prose_template: string[];
}

export interface IngestOutputs {
  inventory: InventoryFile;
  refs: RefEdge[];
  resolver: ResolverFile;
  slices: SliceRecord[];
  deterministic: DeterministicCoverDraft;
  source_sha256: string;
  header_budget: HeaderBudgetFile;
  lint: LintFile;
}
