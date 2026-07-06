import type { EntityClass, JsonValue, RefEdge } from "../../types.js";
import type { CapabilityCode } from "../../ir/capabilities.js";

export interface ManifestIrSummary {
  acceptance_scenarios: string[];
  openapi_operations: string[];
  asyncapi_messages: string[];
  uds_types: string[];
  threat_actors: string[];
  data_flows: string[];
  pii_categories: string[];
  migration_adrs: string[];
}

export interface ManifestEntityReference {
  edge_kind: RefEdge["edge_kind"];
  to_id: string;
  source_path: string;
}

export interface ManifestEntityIrBase<K extends EntityClass = EntityClass> {
  kind: K;
  id: string;
  pointer: string;
  capabilities: CapabilityCode[];
  requires_adrs: string[];
}

export interface ManifestPrivacyRoleIr extends ManifestEntityIrBase<"privacy_role"> {
  role_id: string | null;
  user_type_id: string | null;
  condition_tree: JsonValue | null;
  condition_typed_ast: JsonValue | null;
  condition_ast_coverage: JsonValue | null;
  condition_accessors: JsonValue[];
}

export interface ManifestWorkflowIr extends ManifestEntityIrBase<"workflow" | "element_definition.workflow"> {
  trigger_type: string | null;
  trigger_condition_type: string | null;
  trigger_element_id: string | null;
  action_count: number;
  scheduled: {
    frequency_iso8601: string | null;
    expected_payload_bytes: number | null;
    retries: number | null;
    idempotent: boolean | null;
    interval_seconds: number | null;
  } | null;
}

export interface ManifestWorkflowActionIr extends ManifestEntityIrBase<"workflow.action" | "element_definition.action"> {
  action_type: string | null;
}

export interface ManifestApiEventIr extends ManifestEntityIrBase<"api_event"> {
  method: string;
  path: string;
  action_count: number;
  event_type: string | null;
  data_type: string | null;
  parameter_count: number | null;
  waiting_for_data: boolean | null;
  auth_unecessary: boolean | null;
  ignore_privacy_rules: boolean | null;
}

export interface ManifestApiEventActionIr extends ManifestEntityIrBase<"api_event.action"> {
  action_type: string | null;
  scheduled_api_event_id: string | null;
  schedule_in_seconds: number | null;
}

export interface ManifestExternalHttpCallIr extends ManifestEntityIrBase<"external_http_call"> {
  method: string;
  url: string | null;
  data_type: string | null;
  body_type: string | null;
  ret_value: string | null;
  response_schema_format: string | null;
  namespace_id: string | null;
  call_id: string | null;
  data_binding: Record<string, JsonValue> | null;
}

export interface ManifestExternalHttpNamespaceIr
  extends ManifestEntityIrBase<"external_http_namespace" | "oauth_namespace"> {
  auth_kind: string;
  token_url?: string | null;
  authorize_url?: string | null;
  redirect_uri?: string | null;
  user_info_url?: string | null;
  client_id_env?: string | null;
  client_secret_env?: string | null;
}

export interface ManifestUserTypeIr extends ManifestEntityIrBase<"user_type"> {
  display: string | null;
}

export interface ManifestUserTypeFieldIr extends ManifestEntityIrBase<"user_type.field"> {
  field_id: string;
  type: string | null;
  currency_code: string | null;
  storage_path: string | null;
  mime_type: string | null;
}

export interface ManifestPageIr extends ManifestEntityIrBase<"page"> {
  type: string | null;
  style_ref: string | null;
}

export interface ManifestElementIr extends ManifestEntityIrBase<"element" | "element_definition"> {
  type: string | null;
  style_ref: string | null;
}

export interface ManifestElementDefinitionMarkerIr
  extends ManifestEntityIrBase<"element_definition.field" | "element_definition.state"> {}

export interface ManifestStyleRefIr extends ManifestEntityIrBase<"style_ref" | "style"> {
  style_id: string | null;
}

export interface ManifestCustomStateIr extends ManifestEntityIrBase<"custom_state"> {
  state_key: string | null;
}

export interface ManifestMobileViewIr extends ManifestEntityIrBase<"mobile_view"> {
  breakpoint: string | null;
}

export interface ManifestOptionSetIr extends ManifestEntityIrBase<"option_set"> {
  display: string | null;
}

export interface ManifestOptionSetValueIr extends ManifestEntityIrBase<"option_set.value"> {
  option_set_ref: string | null;
  value: string | null;
}

export interface ManifestPluginIr extends ManifestEntityIrBase<"plugin"> {
  plugin_id: string;
}

export interface ManifestTokenIr extends ManifestEntityIrBase<"color_token" | "font_token"> {
  token_name: string;
}

export interface ManifestSettingsSingletonIr extends ManifestEntityIrBase<"settings_singleton"> {
  key_path: string;
}

export interface ManifestSecretRefIr extends ManifestEntityIrBase<"secret_ref"> {
  key_name: string;
  source_path: string;
}

export interface ManifestPublicIntegrationKeyIr extends ManifestEntityIrBase<"public_integration_key"> {
  suffix: string | null;
  plugin_id_ref: string | null;
}

export interface ManifestIndexOnlyIr extends ManifestEntityIrBase<"index_only"> {
  children: string[];
}

export type ManifestEntityIr =
  | ManifestPrivacyRoleIr
  | ManifestWorkflowIr
  | ManifestWorkflowActionIr
  | ManifestApiEventIr
  | ManifestApiEventActionIr
  | ManifestExternalHttpCallIr
  | ManifestExternalHttpNamespaceIr
  | ManifestUserTypeIr
  | ManifestUserTypeFieldIr
  | ManifestPageIr
  | ManifestElementIr
  | ManifestElementDefinitionMarkerIr
  | ManifestStyleRefIr
  | ManifestCustomStateIr
  | ManifestMobileViewIr
  | ManifestOptionSetIr
  | ManifestOptionSetValueIr
  | ManifestPluginIr
  | ManifestTokenIr
  | ManifestSettingsSingletonIr
  | ManifestSecretRefIr
  | ManifestPublicIntegrationKeyIr
  | ManifestIndexOnlyIr;

export interface ManifestEntityRecord {
  id: string;
  pointer: string;
  entity_class: EntityClass;
  doc_anchors: string[];
  ir: ManifestEntityIr;
  ir_summary: ManifestIrSummary;
  references: ManifestEntityReference[];
}

export interface ManifestM2Doc {
  schema: "m2.phase6.manifest.v1";
  generated_from: "inventory+views";
  counts: {
    acceptance_scenarios: number;
    openapi_operations: number;
    asyncapi_messages: number;
    uds_types: number;
    actors: number;
    data_flows: number;
    pii_categories: number;
    migration_adrs: number;
  };
  entities: ManifestEntityRecord[];
}
