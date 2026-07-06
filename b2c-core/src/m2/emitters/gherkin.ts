export interface EmittedArtifact {
  path: string;
  content: string;
}

interface GherkinScenario {
  scenario_id: string;
  workflow_ref: string;
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function renderFeatureContent(scenario: GherkinScenario): string {
  return [
    `Feature: ${scenario.scenario_id}`,
    "",
    `  Scenario: ${scenario.scenario_id}`,
    `    Given workflow "${scenario.workflow_ref}" is materialized`,
    "    When the deterministic baseline runs",
    "    Then the generated artifacts stay stable",
    "",
  ].join("\n");
}

function renderIndexYaml(scenarios: GherkinScenario[]): string {
  const lines = [
    "version: 1",
    "generated_from: inventory+views",
    `scenario_count: ${scenarios.length}`,
    "scenarios:",
  ];
  for (const scenario of scenarios) {
    const fileName = `${sanitizeSegment(scenario.scenario_id)}.feature`;
    lines.push(`  - id: ${JSON.stringify(scenario.scenario_id)}`);
    lines.push(`    workflow_ref: ${JSON.stringify(scenario.workflow_ref)}`);
    lines.push(`    feature_path: ${JSON.stringify(`agent/acceptance/${fileName}`)}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderUsersFixtureYaml(scenarios: GherkinScenario[]): string {
  const workflowRefs = [...new Set(scenarios.map((scenario) => scenario.workflow_ref))].sort((a, b) => a.localeCompare(b));
  const lines = [
    "version: 1",
    "generated_from: inventory+views",
    "users:",
    "  - id: fixture-admin",
    '    email: "admin@example.com"',
    "    role: admin",
    "    workflow_refs:",
  ];
  for (const workflowRef of workflowRefs) {
    lines.push(`      - ${JSON.stringify(workflowRef)}`);
  }
  lines.push("  - id: fixture-analyst");
  lines.push('    email: "analyst@example.com"');
  lines.push("    role: analyst");
  lines.push("    workflow_refs: []");
  return `${lines.join("\n")}\n`;
}

export function emitGherkinScaffold(scenarios: GherkinScenario[]): EmittedArtifact[] {
  const featureArtifacts = scenarios
    .map((scenario) => ({
      path: `agent/acceptance/${sanitizeSegment(scenario.scenario_id)}.feature`,
      content: renderFeatureContent(scenario),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return [
    ...featureArtifacts,
    {
      path: "agent/acceptance/_index.yaml",
      content: renderIndexYaml(scenarios),
    },
    {
      path: "agent/acceptance/_fixtures/users.yaml",
      content: renderUsersFixtureYaml(scenarios),
    },
  ].sort((a, b) => a.path.localeCompare(b.path));
}
