export interface AcceptanceScenarioIR {
  scenario_id: string;
  workflow_ref: string;
}

export interface OpenApiOperationIR {
  operation_id: string;
  source_kind: "api_event" | "external_http_call";
  source_id: string;
}

export interface AsyncApiMessageIR {
  message_id: string;
  source_id: string;
}

export interface UdsTypeIR {
  id: string;
  user_type_ref: string;
}

export interface ActorIR {
  actor_id: string;
  privacy_role_refs: string[];
}

export interface DataFlowIR {
  flow_id: string;
  source_id: string;
}

export interface PiiCategoryIR {
  field_id: string;
  category: string;
}

export interface MigrationAdrIR {
  adr_id: string;
  entity_id: string;
  status: "pending-m7" | "decided" | "superseded";
}

export interface M2ViewBundle {
  acceptance_scenarios: AcceptanceScenarioIR[];
  openapi_operations: OpenApiOperationIR[];
  asyncapi_messages: AsyncApiMessageIR[];
  uds_types: UdsTypeIR[];
  actors: ActorIR[];
  data_flows: DataFlowIR[];
  pii_categories: PiiCategoryIR[];
  migration_adrs: MigrationAdrIR[];
}
