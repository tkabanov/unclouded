"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildM2Views = buildM2Views;
var id_derivation_js_1 = require("./id-derivation.js");
var MIGRATION_TOUCHPOINTS = [
    { className: "api_event", adrId: "adr-api-contract-surface" },
    { className: "external_http_call", adrId: "adr-external-http-integrations" },
    { className: "oauth_namespace", adrId: "adr-oauth-user-delegation" },
    { className: "secret_ref", adrId: "adr-secret-reference-strategy" },
    { className: "privacy_role", adrId: "adr-privacy-role-enforcement" },
    { className: "user_type", adrId: "adr-user-data-schema-shape" },
];
function classifyPiiCategory(fieldId) {
    var key = fieldId.toLowerCase();
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
function buildM2Views(inventory) {
    var workflowEntries = inventory.entries.filter(function (entry) { return entry.entity_class === "workflow" || entry.entity_class === "element_definition.workflow"; });
    var externalCalls = inventory.entries.filter(function (entry) { return entry.entity_class === "external_http_call"; });
    var apiEvents = inventory.entries.filter(function (entry) { return entry.entity_class === "api_event"; });
    var userTypes = inventory.entries.filter(function (entry) { return entry.entity_class === "user_type"; });
    var privacyRoles = inventory.entries.filter(function (entry) { return entry.entity_class === "privacy_role"; });
    var userTypeFields = inventory.entries.filter(function (entry) { return entry.entity_class === "user_type.field"; });
    var classSet = new Set(inventory.entries.map(function (entry) { return entry.entity_class; }));
    var migration_adrs = MIGRATION_TOUCHPOINTS.filter(function (touchpoint) { return classSet.has(touchpoint.className); })
        .map(function (touchpoint) { return ({
        adr_id: touchpoint.adrId,
        entity_id: "entity_class:".concat(touchpoint.className),
        status: "pending-m7",
    }); })
        .sort(function (a, b) { return a.adr_id.localeCompare(b.adr_id); });
    return {
        acceptance_scenarios: workflowEntries
            .map(function (entry) { return ({
            scenario_id: "scenario:".concat(entry.id),
            workflow_ref: entry.id,
        }); })
            .sort(function (a, b) { return a.scenario_id.localeCompare(b.scenario_id); }),
        openapi_operations: __spreadArray(__spreadArray([], apiEvents.map(function (entry) { return ({
            operation_id: (0, id_derivation_js_1.deriveOperationId)("api_event", entry.id),
            source_kind: "api_event",
            source_id: entry.id,
        }); }), true), externalCalls
            .filter(function (entry) { var _a; return ((_a = entry.meta) === null || _a === void 0 ? void 0 : _a.data_type) !== "stream"; })
            .map(function (entry) { return ({
            operation_id: (0, id_derivation_js_1.deriveOperationId)("external_http_call", entry.id),
            source_kind: "external_http_call",
            source_id: entry.id,
        }); }), true).sort(function (a, b) { return a.operation_id.localeCompare(b.operation_id); }),
        asyncapi_messages: externalCalls
            .filter(function (entry) { var _a; return ((_a = entry.meta) === null || _a === void 0 ? void 0 : _a.data_type) === "stream"; })
            .map(function (entry) { return ({
            message_id: "asyncapi:".concat(entry.id),
            source_id: entry.id,
        }); })
            .sort(function (a, b) { return a.message_id.localeCompare(b.message_id); }),
        uds_types: userTypes
            .map(function (entry) { return ({
            id: "uds:".concat(entry.id),
            user_type_ref: entry.id,
        }); })
            .sort(function (a, b) { return a.id.localeCompare(b.id); }),
        actors: privacyRoles
            .map(function (entry) { return ({
            actor_id: "actor:".concat(entry.id),
            privacy_role_refs: [entry.id],
        }); })
            .sort(function (a, b) { return a.actor_id.localeCompare(b.actor_id); }),
        data_flows: externalCalls
            .map(function (entry) { return ({
            flow_id: "flow:".concat(entry.id),
            source_id: entry.id,
        }); })
            .sort(function (a, b) { return a.flow_id.localeCompare(b.flow_id); }),
        pii_categories: userTypeFields
            .map(function (entry) {
            var _a;
            var rawFieldId = typeof ((_a = entry.meta) === null || _a === void 0 ? void 0 : _a.field_id) === "string" && entry.meta.field_id.length > 0 ? entry.meta.field_id : entry.id;
            var category = classifyPiiCategory(rawFieldId);
            return category === null
                ? null
                : {
                    field_id: entry.id,
                    category: category,
                };
        })
            .filter(function (entry) { return entry !== null; })
            .sort(function (a, b) { return a.field_id.localeCompare(b.field_id); }),
        migration_adrs: migration_adrs,
    };
}
