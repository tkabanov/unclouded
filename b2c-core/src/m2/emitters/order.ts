export const PHASE6_EMITTER_ORDER = [
  "manifest",
  "gherkin",
  "uds",
  "openapi-incoming",
  "openapi-outgoing",
  "asyncapi",
  "adr-scaffold",
  "threat-model",
  "dpia",
  "depgraph",
  "rtm",
  "rtm-validate",
] as const;

export type Phase6EmitterName = (typeof PHASE6_EMITTER_ORDER)[number];
