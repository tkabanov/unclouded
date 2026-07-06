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
exports.emitGherkinScaffold = emitGherkinScaffold;
function sanitizeSegment(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function renderFeatureContent(scenario) {
    return [
        "Feature: ".concat(scenario.scenario_id),
        "",
        "  Scenario: ".concat(scenario.scenario_id),
        "    Given workflow \"".concat(scenario.workflow_ref, "\" is materialized"),
        "    When the deterministic baseline runs",
        "    Then the generated artifacts stay stable",
        "",
    ].join("\n");
}
function renderIndexYaml(scenarios) {
    var lines = [
        "version: 1",
        "generated_from: inventory+views",
        "scenario_count: ".concat(scenarios.length),
        "scenarios:",
    ];
    for (var _i = 0, scenarios_1 = scenarios; _i < scenarios_1.length; _i++) {
        var scenario = scenarios_1[_i];
        var fileName = "".concat(sanitizeSegment(scenario.scenario_id), ".feature");
        lines.push("  - id: ".concat(JSON.stringify(scenario.scenario_id)));
        lines.push("    workflow_ref: ".concat(JSON.stringify(scenario.workflow_ref)));
        lines.push("    feature_path: ".concat(JSON.stringify("agent/acceptance/".concat(fileName))));
    }
    return "".concat(lines.join("\n"), "\n");
}
function renderUsersFixtureYaml(scenarios) {
    var workflowRefs = __spreadArray([], new Set(scenarios.map(function (scenario) { return scenario.workflow_ref; })), true).sort(function (a, b) { return a.localeCompare(b); });
    var lines = [
        "version: 1",
        "generated_from: inventory+views",
        "users:",
        "  - id: fixture-admin",
        '    email: "admin@example.com"',
        "    role: admin",
        "    workflow_refs:",
    ];
    for (var _i = 0, workflowRefs_1 = workflowRefs; _i < workflowRefs_1.length; _i++) {
        var workflowRef = workflowRefs_1[_i];
        lines.push("      - ".concat(JSON.stringify(workflowRef)));
    }
    lines.push("  - id: fixture-analyst");
    lines.push('    email: "analyst@example.com"');
    lines.push("    role: analyst");
    lines.push("    workflow_refs: []");
    return "".concat(lines.join("\n"), "\n");
}
function emitGherkinScaffold(scenarios) {
    var featureArtifacts = scenarios
        .map(function (scenario) { return ({
        path: "agent/acceptance/".concat(sanitizeSegment(scenario.scenario_id), ".feature"),
        content: renderFeatureContent(scenario),
    }); })
        .sort(function (a, b) { return a.path.localeCompare(b.path); });
    return __spreadArray(__spreadArray([], featureArtifacts, true), [
        {
            path: "agent/acceptance/_index.yaml",
            content: renderIndexYaml(scenarios),
        },
        {
            path: "agent/acceptance/_fixtures/users.yaml",
            content: renderUsersFixtureYaml(scenarios),
        },
    ], false).sort(function (a, b) { return a.path.localeCompare(b.path); });
}
