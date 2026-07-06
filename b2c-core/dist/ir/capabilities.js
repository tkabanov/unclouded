"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiresAdrForCapability = requiresAdrForCapability;
exports.capabilitiesForEntityClass = capabilitiesForEntityClass;
var CAPABILITY_REQUIRES_ADR = Object.freeze({
    "api.contract_surface": Object.freeze(["adr-api-contract-surface"]),
    "external_http.integrations": Object.freeze(["adr-external-http-integrations"]),
    "oauth.user_delegation": Object.freeze(["adr-oauth-user-delegation"]),
    "auth.oauth2_user_flow": Object.freeze(["adr-auth-oauth2-user-flow"]),
    "secret.reference_strategy": Object.freeze(["adr-secret-reference-strategy"]),
    "privacy.role_enforcement": Object.freeze(["adr-privacy-role-enforcement"]),
    "rls.cross_table_join": Object.freeze(["adr-rls-cross-table-join"]),
    "rls.recursive_user_type_walk": Object.freeze(["adr-rls-recursive-user-type-walk"]),
    "plugin.unknown": Object.freeze([]),
    "schedule.sub_minute": Object.freeze(["adr-schedule-sub-minute"]),
    "storage.file_upload": Object.freeze([]),
    "i18n.non_app_language": Object.freeze(["adr-i18n-non-app-language"]),
    "ci.non_github_actions": Object.freeze(["adr-ci-non-github-actions"]),
    "contracts.non_openapi_target": Object.freeze(["adr-contracts-non-openapi-target"]),
    "schema.non_relational_target": Object.freeze(["adr-schema-non-relational-target"]),
    "user_data.schema_shape": Object.freeze(["adr-user-data-schema-shape"]),
    "adapter.unsupported_entity_class": Object.freeze([]),
});
function capabilityList(values) {
    return Object.freeze(values);
}
var ENTITY_CAPABILITIES = Object.freeze({
    api_event: capabilityList(["api.contract_surface"]),
    external_http_call: capabilityList(["external_http.integrations"]),
    external_http_namespace: capabilityList(["external_http.integrations"]),
    oauth_namespace: capabilityList(["oauth.user_delegation", "auth.oauth2_user_flow"]),
    secret_ref: capabilityList(["secret.reference_strategy"]),
    privacy_role: capabilityList([
        "privacy.role_enforcement",
        "rls.cross_table_join",
        "rls.recursive_user_type_walk",
    ]),
    user_type: capabilityList(["user_data.schema_shape"]),
    "user_type.field": capabilityList(["user_data.schema_shape"]),
});
function requiresAdrForCapability(capability) {
    return CAPABILITY_REQUIRES_ADR[capability];
}
function capabilitiesForEntityClass(entityClass) {
    var _a;
    return (_a = ENTITY_CAPABILITIES[entityClass]) !== null && _a !== void 0 ? _a : [];
}
