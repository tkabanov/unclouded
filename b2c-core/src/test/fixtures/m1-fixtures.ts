import type { DataSourceKind } from "../../decoders/data-source.js";
import type { TextExpressionHostClass } from "../../decoders/text-expression-hosts.js";

export interface DataSourceFixture {
  name: string;
  raw: unknown;
  expectedKind: DataSourceKind;
  expectedSourceType: string | null;
  expectedUnknown: boolean;
}

export const DATA_SOURCE_FIXTURES: DataSourceFixture[] = [
  {
    name: "ElementParent maps to parent_data",
    raw: { type: "ElementParent" },
    expectedKind: "parent_data",
    expectedSourceType: "ElementParent",
    expectedUnknown: false,
  },
  {
    name: "Search maps to search",
    raw: { type: "Search" },
    expectedKind: "search",
    expectedSourceType: "Search",
    expectedUnknown: false,
  },
  {
    name: "AllOptionValue maps to option_set_value",
    raw: { type: "AllOptionValue" },
    expectedKind: "option_set_value",
    expectedSourceType: "AllOptionValue",
    expectedUnknown: false,
  },
  {
    name: "OneOptionValue maps to option_set_value",
    raw: { type: "OneOptionValue" },
    expectedKind: "option_set_value",
    expectedSourceType: "OneOptionValue",
    expectedUnknown: false,
  },
  {
    name: "OptionValue maps to option_set_value",
    raw: { type: "OptionValue" },
    expectedKind: "option_set_value",
    expectedSourceType: "OptionValue",
    expectedUnknown: false,
  },
  {
    name: "CurrentUser maps to current_user",
    raw: { type: "CurrentUser" },
    expectedKind: "current_user",
    expectedSourceType: "CurrentUser",
    expectedUnknown: false,
  },
  {
    name: "CurrentPageItem maps to current_page_item",
    raw: { type: "CurrentPageItem" },
    expectedKind: "current_page_item",
    expectedSourceType: "CurrentPageItem",
    expectedUnknown: false,
  },
  {
    name: "GetElement maps to element_ref",
    raw: { type: "GetElement" },
    expectedKind: "element_ref",
    expectedSourceType: "GetElement",
    expectedUnknown: false,
  },
  {
    name: "GetParamFromUrl maps to url_param",
    raw: { type: "GetParamFromUrl" },
    expectedKind: "url_param",
    expectedSourceType: "GetParamFromUrl",
    expectedUnknown: false,
  },
  {
    name: "PreviousStep maps to previous_step",
    raw: { type: "PreviousStep" },
    expectedKind: "previous_step",
    expectedSourceType: "PreviousStep",
    expectedUnknown: false,
  },
  {
    name: "GetDataFromAPI without external prefix maps to api_result",
    raw: { type: "GetDataFromAPI", name: "result_field" },
    expectedKind: "api_result",
    expectedSourceType: "GetDataFromAPI",
    expectedUnknown: false,
  },
  {
    name: "GetDataFromAPI with _api_c2 prefix maps to external_api_result",
    raw: { type: "GetDataFromAPI", value: { name: "_api_c2_customer_email" } },
    expectedKind: "external_api_result",
    expectedSourceType: "GetDataFromAPI",
    expectedUnknown: false,
  },
  {
    name: "GetDataFromAPI with nested _api_c2 array maps to external_api_result",
    raw: {
      type: "GetDataFromAPI",
      args: [{ value: { name: "_api_c2_nested_result" } }],
    },
    expectedKind: "external_api_result",
    expectedSourceType: "GetDataFromAPI",
    expectedUnknown: false,
  },
  {
    name: "APIEventParameter maps to api_event_param",
    raw: { type: "APIEventParameter" },
    expectedKind: "api_event_param",
    expectedSourceType: "APIEventParameter",
    expectedUnknown: false,
  },
  {
    name: "ThisElement maps to this_element",
    raw: { type: "ThisElement", properties: { element_id: "bTNEb" } },
    expectedKind: "this_element",
    expectedSourceType: "ThisElement",
    expectedUnknown: false,
  },
  {
    name: "CurrentWorkflowItem maps to current_workflow_item",
    raw: { type: "CurrentWorkflowItem", properties: { event_id: "bToyv2" } },
    expectedKind: "current_workflow_item",
    expectedSourceType: "CurrentWorkflowItem",
    expectedUnknown: false,
  },
  {
    name: "ArbitraryText maps to arbitrary_text",
    raw: {
      type: "ArbitraryText",
      properties: { arbitrary_text: { type: "TextExpression", entries: { "0": "static" } } },
    },
    expectedKind: "arbitrary_text",
    expectedSourceType: "ArbitraryText",
    expectedUnknown: false,
  },
  {
    name: "null maps to opaque_scalar",
    raw: null,
    expectedKind: "opaque_scalar",
    expectedSourceType: null,
    expectedUnknown: false,
  },
  {
    name: "zero maps to opaque_scalar",
    raw: 0,
    expectedKind: "opaque_scalar",
    expectedSourceType: null,
    expectedUnknown: false,
  },
  {
    name: "true maps to opaque_scalar",
    raw: true,
    expectedKind: "opaque_scalar",
    expectedSourceType: null,
    expectedUnknown: false,
  },
  {
    name: "false maps to opaque_scalar",
    raw: false,
    expectedKind: "opaque_scalar",
    expectedSourceType: null,
    expectedUnknown: false,
  },
  {
    name: "unsupported scalar maps to unknown",
    raw: "plain text",
    expectedKind: "unknown",
    expectedSourceType: null,
    expectedUnknown: true,
  },
  {
    name: "undefined maps to unknown",
    raw: undefined,
    expectedKind: "unknown",
    expectedSourceType: null,
    expectedUnknown: true,
  },
  {
    name: "object missing type maps to unknown",
    raw: {},
    expectedKind: "unknown",
    expectedSourceType: null,
    expectedUnknown: true,
  },
  {
    name: "unknown object type maps to unknown",
    raw: { type: "UnsupportedSource" },
    expectedKind: "unknown",
    expectedSourceType: "UnsupportedSource",
    expectedUnknown: true,
  },
];

export const REQUIRED_DATA_SOURCE_KINDS: DataSourceKind[] = [
  "parent_data",
  "search",
  "option_set_value",
  "current_user",
  "current_page_item",
  "element_ref",
  "this_element",
  "current_workflow_item",
  "arbitrary_text",
  "url_param",
  "previous_step",
  "api_result",
  "external_api_result",
  "api_event_param",
  "opaque_scalar",
  "unknown",
];

export interface TextExpressionHostFixture {
  name: string;
  pointer: string;
  hostKey: string;
  expectedHostClass: TextExpressionHostClass | null;
}

export const TEXT_EXPRESSION_HOST_FIXTURES: TextExpressionHostFixture[] = [
  {
    name: "render prop text",
    pointer: "/pages/p1/elements/e1/properties/text",
    hostKey: "text",
    expectedHostClass: "render_prop",
  },
  {
    name: "formatting utility label",
    pointer: "/pages/p1/elements/e1/properties/label",
    hostKey: "label",
    expectedHostClass: "formatting_utility",
  },
  {
    name: "formatting utility content",
    pointer: "/pages/p1/elements/e1/properties/content",
    hostKey: "content",
    expectedHostClass: "formatting_utility",
  },
  {
    name: "formatting utility arbitrary text",
    pointer: "/pages/p1/elements/e1/properties/arbitrary_text",
    hostKey: "arbitrary_text",
    expectedHostClass: "formatting_utility",
  },
  {
    name: "formatting utility unique id",
    pointer: "/pages/p1/elements/e1/properties/unique_id",
    hostKey: "unique_id",
    expectedHostClass: "formatting_utility",
  },
  {
    name: "formatting utility parameter name",
    pointer: "/pages/p1/elements/e1/properties/parameter_name",
    hostKey: "parameter_name",
    expectedHostClass: "formatting_utility",
  },
  {
    name: "formatting utility true formatter",
    pointer: "/pages/p1/elements/e1/properties/formatting_for_true",
    hostKey: "formatting_for_true",
    expectedHostClass: "formatting_utility",
  },
  {
    name: "workflow API substitution body param",
    pointer: "/pages/p1/workflows/w1/actions/a1/properties/body_params_name",
    hostKey: "body_params_name",
    expectedHostClass: "workflow_api_substitution",
  },
  {
    name: "workflow API substitution url param",
    pointer: "/pages/p1/workflows/w1/actions/a1/properties/url_params_id",
    hostKey: "url_params_id",
    expectedHostClass: "workflow_api_substitution",
  },
  {
    name: "workflow API substitution generic params",
    pointer: "/pages/p1/workflows/w1/actions/a1/properties/params_page",
    hostKey: "params_page",
    expectedHostClass: "workflow_api_substitution",
  },
  {
    name: "workflow API substitution header",
    pointer: "/pages/p1/workflows/w1/actions/a1/properties/headers_auth",
    hostKey: "headers_auth",
    expectedHostClass: "workflow_api_substitution",
  },
  {
    name: "workflow API substitution shared header",
    pointer: "/pages/p1/workflows/w1/actions/a1/properties/shared_headers_auth",
    hostKey: "shared_headers_auth",
    expectedHostClass: "workflow_api_substitution",
  },
  {
    name: "workflow API substitution shared param",
    pointer: "/pages/p1/workflows/w1/actions/a1/properties/shared_params_region",
    hostKey: "shared_params_region",
    expectedHostClass: "workflow_api_substitution",
  },
  {
    name: "workflow API substitution workflow param",
    pointer: "/pages/p1/workflows/w1/actions/a1/properties/_wf_param_user",
    hostKey: "_wf_param_user",
    expectedHostClass: "workflow_api_substitution",
  },
  {
    name: "workflow API substitution short param",
    pointer: "/pages/p1/workflows/w1/actions/a1/properties/param_user",
    hostKey: "param_user",
    expectedHostClass: "workflow_api_substitution",
  },
  {
    name: "element definition property",
    pointer: "/element_definitions/ed1/properties/custom_dynamic_value",
    hostKey: "custom_dynamic_value",
    expectedHostClass: "element_definition_opaque",
  },
  {
    name: "element definition condition args",
    pointer:
      "/element_definitions/ed1/elements/e1/states/0/condition/next/next/args",
    hostKey: "args",
    expectedHostClass: "element_definition_opaque",
  },
  {
    name: "opaque host key ABc",
    pointer: "/pages/p1/workflows/w1/actions/a1/properties/ABc",
    hostKey: "ABc",
    expectedHostClass: "element_definition_opaque",
  },
  {
    name: "opaque host key AAf",
    pointer: "/pages/p1/elements/e1/properties/AAf",
    hostKey: "AAf",
    expectedHostClass: "element_definition_opaque",
  },
  {
    name: "opaque host key BFd",
    pointer: "/element_definitions/ed1/workflows/w1/actions/a1/properties/BFd",
    hostKey: "BFd",
    expectedHostClass: "element_definition_opaque",
  },
  {
    name: "opaque host key AAD",
    pointer: "/pages/p1/elements/e1/properties/AAD",
    hostKey: "AAD",
    expectedHostClass: "element_definition_opaque",
  },
  {
    name: "workflow substitution near miss fails closed",
    pointer: "/pages/p1/workflows/w1/actions/a1/properties/body_param_name",
    hostKey: "body_param_name",
    expectedHostClass: null,
  },
  {
    name: "unknown host fails closed",
    pointer: "/pages/p1/elements/e1/properties/unknown_host",
    hostKey: "unknown_host",
    expectedHostClass: null,
  },
];

export const REQUIRED_TEXT_EXPRESSION_HOST_CLASSES: TextExpressionHostClass[] = [
  "render_prop",
  "formatting_utility",
  "workflow_api_substitution",
  "element_definition_opaque",
];

export interface TemplateFixture {
  name: string;
  urlTemplate: string;
  bodyTemplate: string;
  declaredParams: string[];
  expectedPath: string;
  expectedPathParams: string[];
  expectedTemplatedQueryParams: string[];
  expectedLiteralQueryDefaults: Record<string, string>;
  expectedBodyRefs: string[];
  shouldPass: boolean;
}

export const TEMPLATE_FIXTURES: TemplateFixture[] = [
  {
    name: "path, query, and body refs all declared",
    urlTemplate: "https://api.example.com/users/[user_id]/posts?status=[status]&sort=desc",
    bodyTemplate: "{\"user\":\"<user_id>\",\"status\":\"<status>\",\"limit\":\"<limit>\"}",
    declaredParams: ["user_id", "status", "limit"],
    expectedPath: "/users/{user_id}/posts",
    expectedPathParams: ["user_id"],
    expectedTemplatedQueryParams: ["status"],
    expectedLiteralQueryDefaults: { sort: "desc" },
    expectedBodyRefs: ["limit", "status", "user_id"],
    shouldPass: true,
  },
  {
    name: "path and query refs declared with empty body",
    urlTemplate: "https://api.example.com/orgs/[org_id]/users?cursor=[cursor]&limit=50",
    bodyTemplate: "",
    declaredParams: ["org_id", "cursor"],
    expectedPath: "/orgs/{org_id}/users",
    expectedPathParams: ["org_id"],
    expectedTemplatedQueryParams: ["cursor"],
    expectedLiteralQueryDefaults: { limit: "50" },
    expectedBodyRefs: [],
    shouldPass: true,
  },
  {
    name: "body-only refs declared",
    urlTemplate: "https://api.example.com/search",
    bodyTemplate: "{\"query\":\"<query>\",\"page\":\"<page>\"}",
    declaredParams: ["query", "page"],
    expectedPath: "/search",
    expectedPathParams: [],
    expectedTemplatedQueryParams: [],
    expectedLiteralQueryDefaults: {},
    expectedBodyRefs: ["page", "query"],
    shouldPass: true,
  },
  {
    name: "duplicated body refs dedupe",
    urlTemplate: "https://api.example.com/users/[user_id]",
    bodyTemplate: "{\"id\":\"<user_id>\",\"confirm\":\"<user_id>\"}",
    declaredParams: ["user_id"],
    expectedPath: "/users/{user_id}",
    expectedPathParams: ["user_id"],
    expectedTemplatedQueryParams: [],
    expectedLiteralQueryDefaults: {},
    expectedBodyRefs: ["user_id"],
    shouldPass: true,
  },
  {
    name: "dangling body ref fails",
    urlTemplate: "https://api.example.com/users/[user_id]/posts?status=[status]",
    bodyTemplate: "{\"user\":\"<user_id>\",\"status\":\"<status>\",\"cursor\":\"<cursor>\"}",
    declaredParams: ["user_id", "status"],
    expectedPath: "/users/{user_id}/posts",
    expectedPathParams: ["user_id"],
    expectedTemplatedQueryParams: ["status"],
    expectedLiteralQueryDefaults: {},
    expectedBodyRefs: ["cursor", "status", "user_id"],
    shouldPass: false,
  },
  {
    name: "dangling URL query ref fails",
    urlTemplate: "https://api.example.com/users/[user_id]/posts?status=[status]",
    bodyTemplate: "{\"user\":\"<user_id>\"}",
    declaredParams: ["user_id"],
    expectedPath: "/users/{user_id}/posts",
    expectedPathParams: ["user_id"],
    expectedTemplatedQueryParams: ["status"],
    expectedLiteralQueryDefaults: {},
    expectedBodyRefs: ["user_id"],
    shouldPass: false,
  },
  {
    name: "dangling URL path ref fails",
    urlTemplate: "https://api.example.com/users/[user_id]/posts",
    bodyTemplate: "{}",
    declaredParams: [],
    expectedPath: "/users/{user_id}/posts",
    expectedPathParams: ["user_id"],
    expectedTemplatedQueryParams: [],
    expectedLiteralQueryDefaults: {},
    expectedBodyRefs: [],
    shouldPass: false,
  },
];
