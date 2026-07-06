import type { EntityClass, InventoryFile } from "../../types.js";
import type { M2ViewBundle } from "../contracts/view-ir.js";
import { deriveOperationId } from "./id-derivation.js";

const MIGRATION_TOUCHPOINTS: Array<{ className: EntityClass; adrId: string }> = [
  { className: "api_event", adrId: "adr-api-contract-surface" },
  { className: "external_http_call", adrId: "adr-external-http-integrations" },
  { className: "oauth_namespace", adrId: "adr-oauth-user-delegation" },
  { className: "secret_ref", adrId: "adr-secret-reference-strategy" },
  { className: "privacy_role", adrId: "adr-privacy-role-enforcement" },
  { className: "user_type", adrId: "adr-user-data-schema-shape" },
];

function classifyPiiCategory(fieldId: string): string | null {
  const key = fieldId.toLowerCase();
  if (key.includes("email")) {
    return "contact.email";
  }
  if (key.includes("phone") || key.includes("mobile")) {
    return "contact.phone";
  }
  if (key.includes("name") || key.includes("first_name") || key.includes("last_name")) {
    return "profile.name";
  }
  if (key.includes("address") || key.includes("city") || key.includes("zip") || key.includes("postal")) {
    return "location.address";
  }
  if (key.includes("birth") || key.includes("dob")) {
    return "demographic.birth_date";
  }
  if (key.includes("ssn") || key.includes("passport") || key.includes("tax")) {
    return "government.identifier";
  }
  if (key.includes("password") || key.includes("token") || key.includes("secret") || key.includes("key")) {
    return "security.credential";
  }
  return null;
}

export function buildM2Views(inventory: InventoryFile): M2ViewBundle {
  const workflowEntries = inventory.entries.filter(
    (entry) => entry.entity_class === "workflow" || entry.entity_class === "element_definition.workflow",
  );
  const externalCalls = inventory.entries.filter((entry) => entry.entity_class === "external_http_call");
  const apiEvents = inventory.entries.filter((entry) => entry.entity_class === "api_event");
  const userTypes = inventory.entries.filter((entry) => entry.entity_class === "user_type");
  const privacyRoles = inventory.entries.filter((entry) => entry.entity_class === "privacy_role");
  const userTypeFields = inventory.entries.filter((entry) => entry.entity_class === "user_type.field");
  const classSet = new Set(inventory.entries.map((entry) => entry.entity_class));

  const migration_adrs = MIGRATION_TOUCHPOINTS.filter((touchpoint) => classSet.has(touchpoint.className))
    .map((touchpoint) => ({
      adr_id: touchpoint.adrId,
      entity_id: `entity_class:${touchpoint.className}`,
      status: "pending-m7" as const,
    }))
    .sort((a, b) => a.adr_id.localeCompare(b.adr_id));

  return {
    acceptance_scenarios: workflowEntries
      .map((entry) => ({
        scenario_id: `scenario:${entry.id}`,
        workflow_ref: entry.id,
      }))
      .sort((a, b) => a.scenario_id.localeCompare(b.scenario_id)),
    openapi_operations: [
      ...apiEvents.map((entry) => ({
        operation_id: deriveOperationId("api_event", entry.id),
        source_kind: "api_event" as const,
        source_id: entry.id,
      })),
      ...externalCalls
        .filter((entry) => entry.meta?.data_type !== "stream")
        .map((entry) => ({
          operation_id: deriveOperationId("external_http_call", entry.id),
          source_kind: "external_http_call" as const,
          source_id: entry.id,
        })),
    ].sort((a, b) => a.operation_id.localeCompare(b.operation_id)),
    asyncapi_messages: externalCalls
      .filter((entry) => entry.meta?.data_type === "stream")
      .map((entry) => ({
        message_id: `asyncapi:${entry.id}`,
        source_id: entry.id,
      }))
      .sort((a, b) => a.message_id.localeCompare(b.message_id)),
    uds_types: userTypes
      .map((entry) => ({
        id: `uds:${entry.id}`,
        user_type_ref: entry.id,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    actors: privacyRoles
      .map((entry) => ({
        actor_id: `actor:${entry.id}`,
        privacy_role_refs: [entry.id],
      }))
      .sort((a, b) => a.actor_id.localeCompare(b.actor_id)),
    data_flows: externalCalls
      .map((entry) => ({
        flow_id: `flow:${entry.id}`,
        source_id: entry.id,
      }))
      .sort((a, b) => a.flow_id.localeCompare(b.flow_id)),
    pii_categories: userTypeFields
      .map((entry) => {
        const rawFieldId =
          typeof entry.meta?.field_id === "string" && entry.meta.field_id.length > 0 ? entry.meta.field_id : entry.id;
        const category = classifyPiiCategory(rawFieldId);
        return category === null
          ? null
          : {
              field_id: entry.id,
              category,
            };
      })
      .filter((entry): entry is { field_id: string; category: string } => entry !== null)
      .sort((a, b) => a.field_id.localeCompare(b.field_id)),
    migration_adrs,
  };
}
