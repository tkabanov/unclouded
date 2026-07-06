export type TextExpressionHostClass =
  | "render_prop"
  | "formatting_utility"
  | "workflow_api_substitution"
  | "element_definition_opaque";

const RENDER_PROP_HOST_KEYS = new Set([
  "text",
  "placeholder",
  "default_value",
  "initial_content",
  "value",
  "src",
  "alt_tag",
]);

const FORMATTING_UTILITY_HOST_KEYS = new Set([
  "content",
  "arbitrary_text",
  "unique_id",
  "option_display_expression",
  "title_attribute",
  "parameter_name",
  "formatting_for_true",
  "formatting_for_false",
  "find",
  "replace",
  "separator",
  "title",
  "background_image",
  "backdrop_background_image",
  "delimiter",
  "url",
  "regex",
  "label",
  "html_header",
  "meta_title",
  "html",
  "default",
  "new_password",
  "new_password_again",
  "description",
  "image",
  "product_name",
  "charged_user_email",
  "statement_descriptor",
  "dynamic_sort_field",
  "body",
  "to",
  "subject",
  "sender_name",
]);

const WORKFLOW_API_SUBSTITUTION_PREFIXES = [
  "body_params_",
  "url_params_",
  "params_",
  "headers_",
  "shared_headers_",
  "shared_params_",
  "_wf_param_",
  "param_",
] as const;

function isElementDefinitionOpaqueHost(pointer: string): boolean {
  if (!pointer.includes("/element_definitions/")) {
    return false;
  }
  if (pointer.includes("/properties/")) {
    return true;
  }
  if (pointer.includes("/states/") && pointer.includes("/condition/")) {
    return true;
  }
  return pointer.includes("/workflows/") && pointer.includes("/actions/") && pointer.includes("/properties/");
}

const OPAQUE_HOST_KEYS = new Set([
  "AAD",
  "AAE",
  "AAF",
  "AAG",
  "AAH",
  "AAI",
  "AAJ",
  "AAK",
  "AAM",
  "AAN",
  "AAP",
  "AAQ",
  "AAV",
  "AAW",
  "AAX",
  "AAf",
  "AAg",
  "AAh",
  "AAo",
  "ABc",
  "ABC",
  "ABW",
  "ABX",
  "ABY",
  "ABZ",
  "ABa",
  "ABk",
  "ABl",
  "ABm",
  "ABn",
  "ABo",
  "ABp",
  "ACd",
  "ACe",
  "ADk",
  "AGp",
  "BEG",
  "BEI",
  "BFd",
  "BML",
  "BYJ",
  "BuZ",
  "Bub",
  "Bud",
]);

export function resolveTextExpressionHostClass(
  pointer: string,
  hostKey: string,
): TextExpressionHostClass | null {
  if (RENDER_PROP_HOST_KEYS.has(hostKey)) {
    return "render_prop";
  }
  if (FORMATTING_UTILITY_HOST_KEYS.has(hostKey)) {
    return "formatting_utility";
  }
  if (WORKFLOW_API_SUBSTITUTION_PREFIXES.some((prefix) => hostKey.startsWith(prefix))) {
    return "workflow_api_substitution";
  }
  if (OPAQUE_HOST_KEYS.has(hostKey) || isElementDefinitionOpaqueHost(pointer)) {
    return "element_definition_opaque";
  }
  return null;
}
