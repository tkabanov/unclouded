"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.runM2Phase6AcceptanceScaffold = runM2Phase6AcceptanceScaffold;
var hash_js_1 = require("../../utils/hash.js");
var id_leak_js_1 = require("../../lint/id-leak.js");
var asyncapi_js_1 = require("../emitters/asyncapi.js");
var threat_dpia_js_1 = require("../emitters/threat-dpia.js");
var index_js_1 = require("../emitters/index.js");
var id_derivation_js_1 = require("../views/id-derivation.js");
var index_js_2 = require("../views/index.js");
function checkBijection(name, expected, actual, detail) {
    return {
        name: name,
        pass: expected === actual,
        detail: "".concat(detail, ": expected=").concat(expected, ", actual=").concat(actual),
    };
}
function checkUnique(name, values, label) {
    var unique = new Set(values);
    return {
        name: name,
        pass: unique.size === values.length,
        detail: "".concat(label, " unique=").concat(unique.size, ", total=").concat(values.length),
    };
}
function artifactHashes(items) {
    var map = new Map();
    for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
        var item = items_1[_i];
        map.set(item.path, (0, hash_js_1.sha256Text)(item.content));
    }
    return map;
}
function compareArtifactSets(first, second) {
    if (first.size !== second.size) {
        return { pass: false, detail: "artifact count changed: ".concat(first.size, " vs ").concat(second.size) };
    }
    for (var _i = 0, _a = first.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], path = _b[0], hash = _b[1];
        if (second.get(path) !== hash) {
            return { pass: false, detail: "artifact hash mismatch at ".concat(path) };
        }
    }
    return { pass: true, detail: "artifact hashes stable across ".concat(first.size, " files") };
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter(function (item) { return typeof item === "string"; });
}
function sortedUnique(values) {
    return __spreadArray([], new Set(values), true).sort(function (a, b) { return a.localeCompare(b); });
}
function arraysEqual(left, right) {
    if (left.length !== right.length) {
        return false;
    }
    for (var index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) {
            return false;
        }
    }
    return true;
}
function mapValuesSorted(map) {
    var normalized = new Map();
    for (var _i = 0, _a = map.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], values = _b[1];
        normalized.set(key, sortedUnique(values));
    }
    return normalized;
}
function mapStringArrayEqual(left, right) {
    if (left.size !== right.size) {
        return false;
    }
    var normalizedLeft = mapValuesSorted(left);
    var normalizedRight = mapValuesSorted(right);
    for (var _i = 0, _a = normalizedLeft.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], leftValues = _b[1];
        var rightValues = normalizedRight.get(key);
        if (!rightValues || !arraysEqual(leftValues, rightValues)) {
            return false;
        }
    }
    return true;
}
function parseJsonArtifact(artifacts, path) {
    var artifact = artifacts.find(function (item) { return item.path === path; });
    if (!artifact) {
        return null;
    }
    try {
        return JSON.parse(artifact.content);
    }
    catch (_a) {
        return null;
    }
}
function hasString(value) {
    return typeof value === "string" && value.length > 0;
}
function hasStringOrNull(value) {
    return value === null || typeof value === "string";
}
function hasNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function csvCell(line) {
    var out = [];
    var current = "";
    var quoted = false;
    for (var index = 0; index < line.length; index += 1) {
        var char = line[index];
        if (char === '"') {
            var next = line[index + 1];
            if (quoted && next === '"') {
                current += '"';
                index += 1;
            }
            else {
                quoted = !quoted;
            }
            continue;
        }
        if (char === "," && !quoted) {
            out.push(current);
            current = "";
            continue;
        }
        current += char;
    }
    out.push(current);
    return out;
}
var MANIFEST_SUMMARY_KEYS = [
    "acceptance_scenarios",
    "openapi_operations",
    "asyncapi_messages",
    "uds_types",
    "threat_actors",
    "data_flows",
    "pii_categories",
    "migration_adrs",
];
function expectedSummaryMap(inventory, views) {
    var map = new Map();
    var ensure = function (id) {
        var current = map.get(id);
        if (current) {
            return current;
        }
        var created = {
            acceptance_scenarios: [],
            openapi_operations: [],
            asyncapi_messages: [],
            uds_types: [],
            threat_actors: [],
            data_flows: [],
            pii_categories: [],
            migration_adrs: [],
        };
        map.set(id, created);
        return created;
    };
    for (var _i = 0, _a = views.acceptance_scenarios; _i < _a.length; _i++) {
        var scenario = _a[_i];
        ensure(scenario.workflow_ref).acceptance_scenarios.push(scenario.scenario_id);
    }
    for (var _b = 0, _c = views.openapi_operations; _b < _c.length; _b++) {
        var operation = _c[_b];
        ensure(operation.source_id).openapi_operations.push(operation.operation_id);
    }
    for (var _d = 0, _e = views.asyncapi_messages; _d < _e.length; _d++) {
        var message = _e[_d];
        ensure(message.source_id).asyncapi_messages.push(message.message_id);
    }
    for (var _f = 0, _g = views.uds_types; _f < _g.length; _f++) {
        var udsType = _g[_f];
        ensure(udsType.user_type_ref).uds_types.push(udsType.id);
    }
    for (var _h = 0, _j = views.actors; _h < _j.length; _h++) {
        var actor = _j[_h];
        for (var _k = 0, _l = actor.privacy_role_refs; _k < _l.length; _k++) {
            var role = _l[_k];
            ensure(role).threat_actors.push(actor.actor_id);
        }
    }
    for (var _m = 0, _o = views.data_flows; _m < _o.length; _m++) {
        var flow = _o[_m];
        ensure(flow.source_id).data_flows.push(flow.flow_id);
    }
    for (var _p = 0, _q = views.pii_categories; _p < _q.length; _p++) {
        var pii = _q[_p];
        ensure(pii.field_id).pii_categories.push(pii.category);
    }
    for (var _r = 0, _s = views.migration_adrs; _r < _s.length; _r++) {
        var adr = _s[_r];
        var prefix = "entity_class:";
        if (!adr.entity_id.startsWith(prefix)) {
            continue;
        }
        var className = adr.entity_id.slice(prefix.length);
        for (var _t = 0, _u = inventory.entries; _t < _u.length; _t++) {
            var entry = _u[_t];
            if (entry.entity_class === className) {
                ensure(entry.id).migration_adrs.push(adr.adr_id);
            }
        }
    }
    for (var _v = 0, _w = map.values(); _v < _w.length; _v++) {
        var value = _w[_v];
        for (var _x = 0, MANIFEST_SUMMARY_KEYS_1 = MANIFEST_SUMMARY_KEYS; _x < MANIFEST_SUMMARY_KEYS_1.length; _x++) {
            var key = MANIFEST_SUMMARY_KEYS_1[_x];
            value[key] = sortedUnique(value[key]);
        }
    }
    return map;
}
function extractOpenApiOperationIds(doc) {
    if (!isRecord(doc) || !isRecord(doc.paths)) {
        return { operationIds: [], hasSourceMetadata: false };
    }
    var operationIds = [];
    var hasSourceMetadata = true;
    for (var _i = 0, _a = Object.values(doc.paths); _i < _a.length; _i++) {
        var pathValue = _a[_i];
        if (!isRecord(pathValue)) {
            continue;
        }
        for (var _b = 0, _c = Object.values(pathValue); _b < _c.length; _b++) {
            var operation = _c[_b];
            if (!isRecord(operation) || typeof operation.operationId !== "string") {
                continue;
            }
            operationIds.push(operation.operationId);
            var metadata = operation["x-b2c"];
            if (!isRecord(metadata) || typeof metadata.source_id !== "string") {
                hasSourceMetadata = false;
            }
        }
    }
    return { operationIds: sortedUnique(operationIds), hasSourceMetadata: hasSourceMetadata };
}
function extractOpenApiOperationSources(doc) {
    if (!isRecord(doc) || !isRecord(doc.paths)) {
        return [];
    }
    var pairs = [];
    for (var _i = 0, _a = Object.values(doc.paths); _i < _a.length; _i++) {
        var pathValue = _a[_i];
        if (!isRecord(pathValue)) {
            continue;
        }
        for (var _b = 0, _c = Object.values(pathValue); _b < _c.length; _b++) {
            var operation = _c[_b];
            if (!isRecord(operation) || typeof operation.operationId !== "string") {
                continue;
            }
            var metadata = operation["x-b2c"];
            if (!isRecord(metadata) || typeof metadata.source_id !== "string") {
                continue;
            }
            pairs.push({ operationId: operation.operationId, sourceId: metadata.source_id });
        }
    }
    return pairs.sort(function (left, right) {
        if (left.operationId !== right.operationId) {
            return left.operationId.localeCompare(right.operationId);
        }
        return left.sourceId.localeCompare(right.sourceId);
    });
}
function refKey(edge) {
    return "".concat(edge.edge_kind, "|").concat(edge.to_id, "|").concat(edge.source_path);
}
function sortedRefKeys(edges) {
    return edges.map(function (edge) { return refKey(edge); }).sort(function (a, b) { return a.localeCompare(b); });
}
function parseManifestReferences(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .filter(isRecord)
        .map(function (item) { return ({
        edge_kind: typeof item.edge_kind === "string" ? item.edge_kind : "",
        to_id: typeof item.to_id === "string" ? item.to_id : "",
        source_path: typeof item.source_path === "string" ? item.source_path : "",
    }); })
        .filter(function (item) { return item.edge_kind.length > 0 && item.to_id.length > 0 && item.source_path.length > 0; });
}
function deepCloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}
function expectedManifestEntityTriples(inventory) {
    return inventory.entries
        .map(function (entry) { return "".concat(entry.id, "|").concat(entry.pointer, "|").concat(entry.entity_class); })
        .sort(function (a, b) { return a.localeCompare(b); });
}
function extractManifestEntityTriples(entities) {
    return entities
        .filter(isRecord)
        .map(function (entity) {
        var id = typeof entity.id === "string" ? entity.id : "";
        var pointer = typeof entity.pointer === "string" ? entity.pointer : "";
        var entityClass = typeof entity.entity_class === "string" ? entity.entity_class : "";
        return "".concat(id, "|").concat(pointer, "|").concat(entityClass);
    })
        .sort(function (a, b) { return a.localeCompare(b); });
}
function hasManifestEntityIndexParity(entities, inventory) {
    return arraysEqual(extractManifestEntityTriples(entities), expectedManifestEntityTriples(inventory));
}
function buildRefsByFromId(refs) {
    var _a;
    var refsByFromId = new Map();
    for (var _i = 0, refs_1 = refs; _i < refs_1.length; _i++) {
        var edge = refs_1[_i];
        var bucket = (_a = refsByFromId.get(edge.from_id)) !== null && _a !== void 0 ? _a : [];
        bucket.push(edge);
        refsByFromId.set(edge.from_id, bucket);
    }
    return refsByFromId;
}
function hasManifestRefsParity(entities, refsByFromId) {
    var _a;
    for (var _i = 0, entities_1 = entities; _i < entities_1.length; _i++) {
        var rawEntity = entities_1[_i];
        if (!isRecord(rawEntity) || typeof rawEntity.id !== "string") {
            return false;
        }
        var expectedRefs = sortedRefKeys(((_a = refsByFromId.get(rawEntity.id)) !== null && _a !== void 0 ? _a : []).map(function (edge) { return ({
            edge_kind: edge.edge_kind,
            to_id: edge.to_id,
            source_path: edge.source_path,
        }); }));
        var actualRefs = sortedRefKeys(parseManifestReferences(rawEntity.references));
        if (!arraysEqual(actualRefs, expectedRefs)) {
            return false;
        }
    }
    return true;
}
function extractOpenApiPairKeys(doc) {
    return extractOpenApiOperationSources(doc)
        .map(function (pair) { return "".concat(pair.operationId, "|").concat(pair.sourceId); })
        .sort(function (a, b) { return a.localeCompare(b); });
}
function extractManifestOpenApiPairKeys(manifestDoc) {
    var pairSet = new Set();
    if (!isRecord(manifestDoc) || !Array.isArray(manifestDoc.entities)) {
        return [];
    }
    for (var _i = 0, _a = manifestDoc.entities; _i < _a.length; _i++) {
        var entity = _a[_i];
        if (!isRecord(entity) || typeof entity.id !== "string" || !isRecord(entity.ir_summary)) {
            continue;
        }
        var operationIds = asStringArray(entity.ir_summary.openapi_operations);
        for (var _b = 0, operationIds_1 = operationIds; _b < operationIds_1.length; _b++) {
            var operationId = operationIds_1[_b];
            pairSet.add("".concat(operationId, "|").concat(entity.id));
        }
    }
    return __spreadArray([], pairSet, true).sort(function (a, b) { return a.localeCompare(b); });
}
function runM2Phase6AcceptanceScaffold(inventory, refs, context) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (refs === void 0) { refs = []; }
    if (context === void 0) { context = { lint: null, lintLoadError: null }; }
    var views = (0, index_js_2.buildM2Views)(inventory);
    var inventoryById = new Map(inventory.entries.map(function (entry) { return [entry.id, entry]; }));
    var workflowCount = inventory.entries.filter(function (entry) { return entry.entity_class === "workflow" || entry.entity_class === "element_definition.workflow"; }).length;
    var apiEventCount = inventory.entries.filter(function (entry) { return entry.entity_class === "api_event"; }).length;
    var externalCalls = inventory.entries.filter(function (entry) { return entry.entity_class === "external_http_call"; });
    var nonStreamExternal = externalCalls.filter(function (entry) { var _a; return ((_a = entry.meta) === null || _a === void 0 ? void 0 : _a.data_type) !== "stream"; }).length;
    var streamExternal = externalCalls.filter(function (entry) { var _a; return ((_a = entry.meta) === null || _a === void 0 ? void 0 : _a.data_type) === "stream"; }).length;
    var userTypeCount = inventory.entries.filter(function (entry) { return entry.entity_class === "user_type"; }).length;
    var privacyRoleCount = inventory.entries.filter(function (entry) { return entry.entity_class === "privacy_role"; }).length;
    var checks = [
        checkBijection("bijection:acceptance_scenario", workflowCount, views.acceptance_scenarios.length, "workflow->acceptance_scenario"),
        checkBijection("bijection:openapi_operation", apiEventCount + nonStreamExternal, views.openapi_operations.length, "api_event + non_stream_external_http_call -> openapi_operation"),
        checkBijection("bijection:asyncapi_message", streamExternal, views.asyncapi_messages.length, "stream_external_http_call -> asyncapi_message"),
        checkBijection("bijection:uds_type", userTypeCount, views.uds_types.length, "user_type->uds_type"),
        checkBijection("bijection:threat_actor", privacyRoleCount, views.actors.length, "privacy_role->threat_actor"),
        checkBijection("bijection:data_flow", externalCalls.length, views.data_flows.length, "external_http_call->data_flow"),
        checkUnique("mapping:openapi_source_unique", views.openapi_operations.map(function (item) { return "".concat(item.source_kind, ":").concat(item.source_id); }), "openapi source mapping"),
        checkUnique("mapping:asyncapi_source_unique", views.asyncapi_messages.map(function (item) { return item.source_id; }), "asyncapi source mapping"),
        checkUnique("mapping:data_flow_source_unique", views.data_flows.map(function (item) { return item.source_id; }), "data_flow source mapping"),
        checkUnique("mapping:actor_role_unique", views.actors.flatMap(function (item) { return item.privacy_role_refs; }), "actor privacy_role mapping"),
        checkUnique("mapping:uds_user_type_unique", views.uds_types.map(function (item) { return item.user_type_ref; }), "uds user_type mapping"),
    ];
    var first = (0, index_js_1.emitAllPhase6Scaffolds)(inventory, views, refs);
    var second = (0, index_js_1.emitAllPhase6Scaffolds)(inventory, views, refs);
    var opaqueIds = (0, id_leak_js_1.collectOpaqueInventoryIds)(inventory.entries.map(function (entry) { return entry.id; }));
    var idLeakFindings = (0, id_leak_js_1.lintRawIdLeaksInDocTemplates)(first.artifacts, opaqueIds);
    checks.push({
        name: "lint:id_leak_docs_templates",
        pass: idLeakFindings.length === 0,
        detail: idLeakFindings.length === 0
            ? "no raw ID leaks in generated docs/templates (within lint scope)"
            : idLeakFindings
                .slice(0, 5)
                .map(function (finding) { return "".concat(finding.path, ":").concat(finding.line, " token=").concat(finding.token); })
                .join("; "),
    });
    var lintFile = context.lint;
    var lintLoadError = context.lintLoadError;
    var lintIssues = (_a = lintFile === null || lintFile === void 0 ? void 0 : lintFile.suspicious_public_integration_keys) !== null && _a !== void 0 ? _a : [];
    var lintPass = lintLoadError === null && lintFile !== null && lintFile.status === "pass" && lintIssues.length === 0;
    checks.push({
        name: "gate:secrets_redaction_lint",
        pass: lintPass,
        detail: lintLoadError !== null
            ? "failed to load target state/lint.json: ".concat(lintLoadError)
            : lintFile === null
                ? "missing target state/lint.json"
                : lintFile.status === "pass" && lintIssues.length === 0
                    ? "state/lint.json passed (status=pass, suspicious_public_integration_keys=0)"
                    : "state/lint.json failed: status=".concat(lintFile.status, ", suspicious_public_integration_keys=").concat(lintIssues
                        .slice(0, 5)
                        .map(function (issue) { return issue.key; })
                        .join(",")),
    });
    var manifestDoc = parseJsonArtifact(first.artifacts, "agent/manifest.m2.json");
    var manifestAliasDoc = parseJsonArtifact(first.artifacts, "agent/manifest.json");
    var manifestPrimaryArtifact = first.artifacts.find(function (artifact) { return artifact.path === "agent/manifest.m2.json"; });
    var manifestAliasArtifact = first.artifacts.find(function (artifact) { return artifact.path === "agent/manifest.json"; });
    checks.push({
        name: "manifest:alias_presence",
        pass: Boolean(manifestPrimaryArtifact) && Boolean(manifestAliasArtifact),
        detail: manifestPrimaryArtifact && manifestAliasArtifact
            ? "manifest.m2.json and manifest.json are both emitted"
            : "missing one of manifest.m2.json / manifest.json",
    });
    checks.push({
        name: "manifest:alias_parity",
        pass: manifestPrimaryArtifact !== undefined &&
            manifestAliasArtifact !== undefined &&
            manifestPrimaryArtifact.content === manifestAliasArtifact.content,
        detail: manifestPrimaryArtifact && manifestAliasArtifact && manifestPrimaryArtifact.content === manifestAliasArtifact.content
            ? "manifest alias content is byte-identical"
            : "manifest alias content mismatch",
    });
    if (!isRecord(manifestDoc)) {
        checks.push({
            name: "manifest:parse",
            pass: false,
            detail: "agent/manifest.m2.json missing or invalid JSON",
        });
    }
    else {
        var expectedCounts = {
            acceptance_scenarios: views.acceptance_scenarios.length,
            openapi_operations: views.openapi_operations.length,
            asyncapi_messages: views.asyncapi_messages.length,
            uds_types: views.uds_types.length,
            actors: views.actors.length,
            data_flows: views.data_flows.length,
            pii_categories: views.pii_categories.length,
            migration_adrs: views.migration_adrs.length,
        };
        var manifestCounts_1 = isRecord(manifestDoc.counts) ? manifestDoc.counts : null;
        var hasCounts = manifestCounts_1 !== null && Object.entries(expectedCounts).every(function (_a) {
            var key = _a[0], value = _a[1];
            return manifestCounts_1[key] === value;
        });
        checks.push({
            name: "manifest:counts",
            pass: hasCounts,
            detail: hasCounts ? "manifest counts aligned with view bundle" : "manifest counts mismatch",
        });
        var entities = Array.isArray(manifestDoc.entities) ? manifestDoc.entities : [];
        var manifestIds = entities
            .filter(isRecord)
            .map(function (entity) { return entity.id; })
            .filter(function (id) { return typeof id === "string"; });
        var manifestTriples = extractManifestEntityTriples(entities);
        var expectedTriples = expectedManifestEntityTriples(inventory);
        checks.push({
            name: "manifest:entity_index",
            pass: arraysEqual(manifestTriples, expectedTriples),
            detail: "manifest entities=".concat(manifestIds.length, ", inventory entries=").concat(inventory.entries.length),
        });
        var recordKeySet = new Set(expectedTriples);
        var expectedSummary = expectedSummaryMap(inventory, views);
        var identityPass = true;
        var completenessPass = true;
        var typedIrPass = true;
        var typedIrCriticalPass = true;
        var typedIrCapabilityPass = true;
        var workflowActionTypePass = true;
        var refsParityPass = true;
        var refsByFromId = buildRefsByFromId(refs);
        for (var _i = 0, entities_2 = entities; _i < entities_2.length; _i++) {
            var rawEntity = entities_2[_i];
            if (!isRecord(rawEntity) || typeof rawEntity.id !== "string") {
                identityPass = false;
                completenessPass = false;
                typedIrPass = false;
                break;
            }
            var pointer = typeof rawEntity.pointer === "string" ? rawEntity.pointer : "";
            var entityClass = typeof rawEntity.entity_class === "string" ? rawEntity.entity_class : "";
            if (!recordKeySet.has("".concat(rawEntity.id, "|").concat(pointer, "|").concat(entityClass))) {
                identityPass = false;
                break;
            }
            var typedIr = rawEntity.ir;
            if (!isRecord(typedIr) || typeof typedIr.kind !== "string" || typedIr.kind !== entityClass) {
                typedIrPass = false;
            }
            else {
                switch (entityClass) {
                    case "privacy_role":
                        var conditionCoverage = isRecord(typedIr.condition_ast_coverage)
                            ? typedIr.condition_ast_coverage
                            : null;
                        var unknownNodeCount = conditionCoverage === null || conditionCoverage === void 0 ? void 0 : conditionCoverage.unknown_node_count;
                        if (!hasString(typedIr.role_id) ||
                            !hasString(typedIr.user_type_id) ||
                            !Array.isArray(typedIr.condition_accessors) ||
                            typedIr.condition_typed_ast === null ||
                            conditionCoverage === null ||
                            conditionCoverage.schema !== "b2c.message_tree_ast_coverage.v1" ||
                            !hasNumber(conditionCoverage.node_count) ||
                            !hasNumber(conditionCoverage.max_depth) ||
                            !hasNumber(conditionCoverage.operation_count) ||
                            !hasNumber(conditionCoverage.accessor_count) ||
                            !isRecord(conditionCoverage.op_counts) ||
                            !isRecord(conditionCoverage.accessor_kind_counts) ||
                            !hasNumber(unknownNodeCount) ||
                            unknownNodeCount !== 0) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    case "workflow":
                    case "element_definition.workflow":
                        if (!hasStringOrNull(typedIr.trigger_type) ||
                            !hasStringOrNull(typedIr.trigger_condition_type) ||
                            !hasStringOrNull(typedIr.trigger_element_id) ||
                            !hasNumber(typedIr.action_count)) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    case "workflow.action":
                    case "element_definition.action":
                        if (!hasStringOrNull(typedIr.action_type)) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    case "api_event.action":
                        if (!hasStringOrNull(typedIr.action_type) ||
                            !hasStringOrNull(typedIr.scheduled_api_event_id) ||
                            !(typedIr.schedule_in_seconds === null ||
                                (typeof typedIr.schedule_in_seconds === "number" && Number.isFinite(typedIr.schedule_in_seconds)))) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    case "api_event":
                        if (!hasString(typedIr.method) ||
                            !hasString(typedIr.path) ||
                            !hasNumber(typedIr.action_count) ||
                            !hasStringOrNull(typedIr.event_type) ||
                            !hasStringOrNull(typedIr.data_type) ||
                            !(typedIr.parameter_count === null ||
                                (typeof typedIr.parameter_count === "number" && Number.isFinite(typedIr.parameter_count))) ||
                            !(typedIr.waiting_for_data === null ||
                                typeof typedIr.waiting_for_data === "boolean") ||
                            !(typedIr.auth_unecessary === null ||
                                typeof typedIr.auth_unecessary === "boolean") ||
                            !(typedIr.ignore_privacy_rules === null ||
                                typeof typedIr.ignore_privacy_rules === "boolean")) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    case "external_http_call":
                        if (!hasString(typedIr.method) ||
                            !hasString(typedIr.namespace_id) ||
                            !hasString(typedIr.call_id) ||
                            !hasStringOrNull(typedIr.url) ||
                            !hasStringOrNull(typedIr.data_type)) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    case "external_http_namespace":
                    case "oauth_namespace":
                        if (!hasString(typedIr.auth_kind)) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    case "user_type":
                        if (!hasStringOrNull(typedIr.display)) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    case "user_type.field":
                        if (!hasString(typedIr.field_id) ||
                            !hasStringOrNull(typedIr.type) ||
                            !hasStringOrNull(typedIr.storage_path) ||
                            !hasStringOrNull(typedIr.mime_type)) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    case "page":
                    case "element":
                    case "element_definition":
                        if (!hasStringOrNull(typedIr.type) || !hasStringOrNull(typedIr.style_ref)) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    case "style_ref":
                    case "style":
                        if (!hasStringOrNull(typedIr.style_id)) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    case "custom_state":
                        if (!hasStringOrNull(typedIr.state_key)) {
                            typedIrCriticalPass = false;
                        }
                        break;
                    default:
                        break;
                }
            }
            var typedIrRecord = typedIr;
            if (entityClass === "workflow.action" ||
                entityClass === "element_definition.action" ||
                entityClass === "api_event.action") {
                var inventoryAction = inventoryById.get(rawEntity.id);
                var expectedActionType = inventoryAction && isRecord(inventoryAction.meta) && typeof inventoryAction.meta.action_type === "string"
                    ? inventoryAction.meta.action_type
                    : null;
                var typedIrActionType = typedIrRecord.action_type;
                var actualActionType = typeof typedIrActionType === "string" ? typedIrActionType : null;
                if (actualActionType !== expectedActionType) {
                    workflowActionTypePass = false;
                }
            }
            var capabilities = Array.isArray(typedIrRecord.capabilities)
                ? typedIrRecord.capabilities.filter(function (item) { return typeof item === "string"; })
                : [];
            var requiresAdrs = Array.isArray(typedIrRecord.requires_adrs)
                ? typedIrRecord.requires_adrs.filter(function (item) { return typeof item === "string"; })
                : [];
            if (!Array.isArray(typedIrRecord.capabilities) || capabilities.length !== typedIrRecord.capabilities.length) {
                typedIrCapabilityPass = false;
            }
            if (!Array.isArray(typedIrRecord.requires_adrs)) {
                typedIrCapabilityPass = false;
            }
            if (Array.isArray(typedIrRecord.requires_adrs) && requiresAdrs.length !== typedIrRecord.requires_adrs.length) {
                typedIrCapabilityPass = false;
            }
            if (entityClass === "oauth_namespace" && !capabilities.includes("auth.oauth2_user_flow")) {
                typedIrCapabilityPass = false;
            }
            if (entityClass === "privacy_role" &&
                !capabilities.some(function (capability) { return capability === "rls.cross_table_join" || capability === "rls.recursive_user_type_walk"; })) {
                typedIrCapabilityPass = false;
            }
            if (!requiresAdrs.every(function (value) { return typeof value === "string"; })) {
                typedIrCapabilityPass = false;
            }
            var expectedRefs = sortedRefKeys(((_b = refsByFromId.get(rawEntity.id)) !== null && _b !== void 0 ? _b : []).map(function (edge) { return ({
                edge_kind: edge.edge_kind,
                to_id: edge.to_id,
                source_path: edge.source_path,
            }); }));
            var actualRefs = sortedRefKeys(parseManifestReferences(rawEntity.references));
            if (!arraysEqual(actualRefs, expectedRefs)) {
                refsParityPass = false;
            }
            var anchors = asStringArray(rawEntity.doc_anchors);
            if (anchors.length === 0 || !anchors.includes("agent/rtm.csv#entity_id:".concat(rawEntity.id))) {
                completenessPass = false;
            }
            var summary = isRecord(rawEntity.ir_summary) ? rawEntity.ir_summary : {};
            var summaryMap = summary;
            var expected = (_c = expectedSummary.get(rawEntity.id)) !== null && _c !== void 0 ? _c : {
                acceptance_scenarios: [],
                openapi_operations: [],
                asyncapi_messages: [],
                uds_types: [],
                threat_actors: [],
                data_flows: [],
                pii_categories: [],
                migration_adrs: [],
            };
            for (var _h = 0, MANIFEST_SUMMARY_KEYS_2 = MANIFEST_SUMMARY_KEYS; _h < MANIFEST_SUMMARY_KEYS_2.length; _h++) {
                var key = MANIFEST_SUMMARY_KEYS_2[_h];
                var actualValues = sortedUnique(asStringArray(summaryMap[key]));
                var expectedValues = expected[key];
                if (!arraysEqual(actualValues, expectedValues)) {
                    completenessPass = false;
                    break;
                }
            }
            if (!completenessPass) {
                break;
            }
        }
        checks.push({
            name: "manifest:entity_identity",
            pass: identityPass,
            detail: identityPass ? "manifest entity id/pointer/class matched inventory" : "manifest identity mismatch",
        });
        checks.push({
            name: "manifest:completeness",
            pass: completenessPass,
            detail: completenessPass
                ? "manifest anchors and ir_summary complete for all entities"
                : "manifest missing anchors or ir_summary mappings",
        });
        checks.push({
            name: "manifest:typed_ir_presence",
            pass: typedIrPass,
            detail: typedIrPass
                ? "manifest typed ir payload present and aligned for all entities"
                : "manifest typed ir payload missing or kind mismatch",
        });
        checks.push({
            name: "manifest:typed_ir_critical_fields",
            pass: typedIrCriticalPass,
            detail: typedIrCriticalPass
                ? "discriminated typed ir fields present for privacy/workflow/api/external/user/page-element/style/custom_state classes"
                : "discriminated typed ir fields missing for at least one targeted entity class",
        });
        checks.push({
            name: "manifest:typed_ir_capabilities",
            pass: typedIrCapabilityPass,
            detail: typedIrCapabilityPass
                ? "typed ir capabilities/requires_adrs fields are present and include oauth2/rls near-term arms"
                : "typed ir capabilities/requires_adrs missing or missing oauth2/rls near-term arms",
        });
        checks.push({
            name: "manifest:workflow_action_type_mapping",
            pass: workflowActionTypePass,
            detail: workflowActionTypePass
                ? "workflow.action typed ir action_type matches inventory meta.action_type"
                : "workflow.action typed ir action_type does not match inventory meta.action_type",
        });
        checks.push({
            name: "manifest:refs_cross_validation",
            pass: refsParityPass,
            detail: refsParityPass
                ? "manifest references are in parity with index/refs.json"
                : "manifest references differ from index/refs.json for at least one entity",
        });
        if (entities.length === 0) {
            checks.push({
                name: "synthetic:manifest_refs_drift_detection",
                pass: false,
                detail: "cannot run synthetic refs drift detector without manifest entities",
            });
            checks.push({
                name: "synthetic:manifest_entity_index_drift_detection",
                pass: false,
                detail: "cannot run synthetic entity-index drift detector without manifest entities",
            });
        }
        else {
            var tamperedRefsEntities = deepCloneJson(entities);
            var firstEntity = tamperedRefsEntities.find(function (entity) { return isRecord(entity) && typeof entity.id === "string"; });
            if (firstEntity) {
                var currentReferences = parseManifestReferences(firstEntity.references);
                if (currentReferences.length > 0) {
                    firstEntity.references = currentReferences.slice(1);
                }
                else {
                    firstEntity.references = [{ edge_kind: "synthetic.drift", to_id: "synthetic:missing", source_path: "$.synthetic" }];
                }
            }
            var refsDriftDetected = !hasManifestRefsParity(tamperedRefsEntities, refsByFromId);
            checks.push({
                name: "synthetic:manifest_refs_drift_detection",
                pass: refsDriftDetected,
                detail: refsDriftDetected
                    ? "tampered manifest references were detected as parity mismatch"
                    : "tampered manifest references were not detected by refs parity detector",
            });
            var tamperedEntityIndexEntities = deepCloneJson(entities);
            var identityTarget = tamperedEntityIndexEntities.find(function (entity) { return isRecord(entity) && typeof entity.id === "string"; });
            if (identityTarget) {
                identityTarget.pointer =
                    typeof identityTarget.pointer === "string" ? "".concat(identityTarget.pointer, "#synthetic-drift") : "#synthetic-drift";
            }
            var entityIndexDriftDetected = !hasManifestEntityIndexParity(tamperedEntityIndexEntities, inventory);
            checks.push({
                name: "synthetic:manifest_entity_index_drift_detection",
                pass: entityIndexDriftDetected,
                detail: entityIndexDriftDetected
                    ? "tampered manifest entity identity triple was detected as index mismatch"
                    : "tampered manifest entity identity triple was not detected by entity-index detector",
            });
        }
    }
    checks.push({
        name: "manifest:alias_parse",
        pass: isRecord(manifestAliasDoc),
        detail: isRecord(manifestAliasDoc) ? "agent/manifest.json parses as JSON" : "agent/manifest.json invalid JSON",
    });
    var incomingOpenApi = parseJsonArtifact(first.artifacts, "agent/contracts/openapi-incoming.json");
    var outgoingOpenApi = parseJsonArtifact(first.artifacts, "agent/contracts/openapi-outgoing.json");
    var artifactPathSet = new Set(first.artifacts.map(function (artifact) { return artifact.path; }));
    var requiredArtifacts = [
        "agent/manifest.m2.json",
        "agent/manifest.json",
        "agent/rtm.csv",
        "agent/contracts/openapi-incoming.json",
        "agent/contracts/openapi-incoming.yaml",
        "agent/contracts/openapi-outgoing.json",
        "agent/contracts/openapi-outgoing.yaml",
        "agent/contracts/asyncapi.json",
        "agent/acceptance/_index.yaml",
        "agent/acceptance/_fixtures/users.yaml",
        "agent/schema/uds.json",
        "agent/schema/uds.yaml",
        "agent/schema/uds.prisma",
        "agent/schema/uds.ddl.sql",
        "agent/schema/uds.graphql",
        "agent/schema/uds.types.ts",
        "agent/schema/rls.sql",
        "agent/schema/migrations/0001_uds_scaffold.sql",
        "agent/depgraph.json",
        "agent/adr-index.json",
        "agent/security/threat-index.json",
        "agent/security/dpia-index.json",
        "docs/security/threat-model.md",
        "docs/privacy/dpia-lite.md",
    ];
    var missingRequiredArtifacts = requiredArtifacts.filter(function (path) { return !artifactPathSet.has(path); });
    checks.push({
        name: "artifact:emitter_presence",
        pass: missingRequiredArtifacts.length === 0,
        detail: missingRequiredArtifacts.length === 0
            ? "required artifacts present (".concat(requiredArtifacts.length, ")")
            : "missing artifacts: ".concat(missingRequiredArtifacts.join(", ")),
    });
    var threatDocArtifact = first.artifacts.find(function (artifact) { return artifact.path === "docs/security/threat-model.md"; });
    var dpiaDocArtifact = first.artifacts.find(function (artifact) { return artifact.path === "docs/privacy/dpia-lite.md"; });
    var threatHasBanner = (_d = threatDocArtifact === null || threatDocArtifact === void 0 ? void 0 : threatDocArtifact.content.includes(threat_dpia_js_1.SECURITY_REVIEW_BANNER)) !== null && _d !== void 0 ? _d : false;
    var dpiaHasBanner = (_e = dpiaDocArtifact === null || dpiaDocArtifact === void 0 ? void 0 : dpiaDocArtifact.content.includes(threat_dpia_js_1.SECURITY_REVIEW_BANNER)) !== null && _e !== void 0 ? _e : false;
    checks.push({
        name: "gate:threat_dpia_banner",
        pass: threatHasBanner && dpiaHasBanner,
        detail: "threat_banner=".concat(threatHasBanner, ", dpia_banner=").concat(dpiaHasBanner),
    });
    var incomingNamespaceYamlCount = first.artifacts.filter(function (artifact) {
        return artifact.path.startsWith("agent/contracts/openapi-incoming/") &&
            artifact.path.endsWith(".yaml") &&
            artifact.path !== "agent/contracts/openapi-incoming.yaml";
    }).length;
    var outgoingNamespaceYamlCount = first.artifacts.filter(function (artifact) {
        return artifact.path.startsWith("agent/contracts/openapi-outgoing/") &&
            artifact.path.endsWith(".yaml") &&
            artifact.path !== "agent/contracts/openapi-outgoing.yaml";
    }).length;
    var incomingExpectedOps = sortedUnique(views.openapi_operations
        .filter(function (operation) { return operation.source_kind === "api_event"; })
        .map(function (operation) { return operation.operation_id; }));
    var outgoingExpectedOps = sortedUnique(views.openapi_operations
        .filter(function (operation) { return operation.source_kind === "external_http_call"; })
        .map(function (operation) { return operation.operation_id; }));
    var incomingExpectedNamespaceFiles = sortedUnique(views.openapi_operations
        .filter(function (operation) { return operation.source_kind === "api_event"; })
        .map(function (operation) { return "agent/contracts/openapi-incoming/".concat((0, id_derivation_js_1.deriveOpenApiNamespaceSlug)("api_event", operation.source_id), ".yaml"); }));
    var outgoingExpectedNamespaceFiles = sortedUnique(views.openapi_operations
        .filter(function (operation) { return operation.source_kind === "external_http_call"; })
        .map(function (operation) {
        return "agent/contracts/openapi-outgoing/".concat((0, id_derivation_js_1.deriveOpenApiNamespaceSlug)("external_http_call", operation.source_id), ".yaml");
    }));
    var incomingActualNamespaceFiles = sortedUnique(first.artifacts
        .map(function (artifact) { return artifact.path; })
        .filter(function (path) {
        return path.startsWith("agent/contracts/openapi-incoming/") &&
            path.endsWith(".yaml") &&
            path !== "agent/contracts/openapi-incoming.yaml";
    }));
    var outgoingActualNamespaceFiles = sortedUnique(first.artifacts
        .map(function (artifact) { return artifact.path; })
        .filter(function (path) {
        return path.startsWith("agent/contracts/openapi-outgoing/") &&
            path.endsWith(".yaml") &&
            path !== "agent/contracts/openapi-outgoing.yaml";
    }));
    checks.push({
        name: "artifact:openapi_namespace_yaml_presence",
        pass: arraysEqual(incomingActualNamespaceFiles, incomingExpectedNamespaceFiles) &&
            arraysEqual(outgoingActualNamespaceFiles, outgoingExpectedNamespaceFiles) &&
            (incomingExpectedOps.length === 0 || incomingNamespaceYamlCount > 0) &&
            (outgoingExpectedOps.length === 0 || outgoingNamespaceYamlCount > 0),
        detail: "incoming namespace yaml=".concat(incomingNamespaceYamlCount, "/").concat(incomingExpectedNamespaceFiles.length, ", outgoing namespace yaml=").concat(outgoingNamespaceYamlCount, "/").concat(outgoingExpectedNamespaceFiles.length),
    });
    var featureCount = first.artifacts.filter(function (artifact) { return artifact.path.startsWith("agent/acceptance/") && artifact.path.endsWith(".feature"); }).length;
    checks.push({
        name: "artifact:gherkin_bijection",
        pass: featureCount === views.acceptance_scenarios.length,
        detail: "feature files=".concat(featureCount, ", scenarios=").concat(views.acceptance_scenarios.length),
    });
    var adrCount = first.artifacts.filter(function (artifact) { return artifact.path.startsWith("docs/adr/") && artifact.path.endsWith(".md"); }).length;
    checks.push({
        name: "artifact:adr_bijection",
        pass: adrCount === views.migration_adrs.length,
        detail: "adr files=".concat(adrCount, ", migration_adrs=").concat(views.migration_adrs.length),
    });
    var incomingExtract = extractOpenApiOperationIds(incomingOpenApi);
    var outgoingExtract = extractOpenApiOperationIds(outgoingOpenApi);
    checks.push({
        name: "artifact:openapi_integrity",
        pass: arraysEqual(incomingExtract.operationIds, incomingExpectedOps) &&
            arraysEqual(outgoingExtract.operationIds, outgoingExpectedOps) &&
            incomingExtract.hasSourceMetadata &&
            outgoingExtract.hasSourceMetadata,
        detail: "incoming ops=".concat(incomingExtract.operationIds.length, ", outgoing ops=").concat(outgoingExtract.operationIds.length),
    });
    var expectedPairKeys = views.openapi_operations
        .map(function (operation) { return "".concat(operation.operation_id, "|").concat(operation.source_id); })
        .sort(function (a, b) { return a.localeCompare(b); });
    var actualPairKeys = __spreadArray(__spreadArray([], extractOpenApiPairKeys(incomingOpenApi), true), extractOpenApiPairKeys(outgoingOpenApi), true).sort(function (a, b) {
        return a.localeCompare(b);
    });
    var manifestPairKeys = extractManifestOpenApiPairKeys(manifestDoc);
    checks.push({
        name: "gate:openapi_ir_roundtrip",
        pass: arraysEqual(actualPairKeys, expectedPairKeys) && arraysEqual(manifestPairKeys, expectedPairKeys),
        detail: "pairs expected=".concat(expectedPairKeys.length, ", openapi=").concat(actualPairKeys.length, ", manifest=").concat(manifestPairKeys.length),
    });
    if (expectedPairKeys.length === 0) {
        checks.push({
            name: "synthetic:openapi_ir_roundtrip_drift_detection",
            pass: false,
            detail: "cannot run synthetic openapi roundtrip drift detector without expected operation/source pairs",
        });
    }
    else {
        var tamperedIncoming = deepCloneJson(incomingOpenApi);
        var tamperedOutgoing = deepCloneJson(outgoingOpenApi);
        var tampered = false;
        var docs = [tamperedIncoming, tamperedOutgoing];
        for (var _j = 0, docs_1 = docs; _j < docs_1.length; _j++) {
            var doc = docs_1[_j];
            if (!isRecord(doc) || !isRecord(doc.paths)) {
                continue;
            }
            for (var _k = 0, _l = Object.values(doc.paths); _k < _l.length; _k++) {
                var pathValue = _l[_k];
                if (!isRecord(pathValue)) {
                    continue;
                }
                for (var _m = 0, _o = Object.values(pathValue); _m < _o.length; _m++) {
                    var operation = _o[_m];
                    if (!isRecord(operation) || typeof operation.operationId !== "string") {
                        continue;
                    }
                    var metadata = operation["x-b2c"];
                    if (!isRecord(metadata) || typeof metadata.source_id !== "string") {
                        continue;
                    }
                    metadata.source_id = "".concat(metadata.source_id, "#synthetic-drift");
                    tampered = true;
                    break;
                }
                if (tampered) {
                    break;
                }
            }
            if (tampered) {
                break;
            }
        }
        var tamperedActualPairKeys = __spreadArray(__spreadArray([], extractOpenApiPairKeys(tamperedIncoming), true), extractOpenApiPairKeys(tamperedOutgoing), true).sort(function (a, b) { return a.localeCompare(b); });
        var openApiDriftDetected = tampered && !arraysEqual(tamperedActualPairKeys, expectedPairKeys);
        checks.push({
            name: "synthetic:openapi_ir_roundtrip_drift_detection",
            pass: openApiDriftDetected,
            detail: openApiDriftDetected
                ? "tampered openapi operation/source pairing was detected by roundtrip gate"
                : "tampered openapi operation/source pairing was not detected by roundtrip gate",
        });
    }
    var asyncApiDoc = parseJsonArtifact(first.artifacts, "agent/contracts/asyncapi.json");
    if (!isRecord(asyncApiDoc) || !isRecord(asyncApiDoc.components) || !isRecord(asyncApiDoc.components.messages)) {
        checks.push({
            name: "artifact:asyncapi_integrity",
            pass: false,
            detail: "asyncapi scaffold missing components.messages",
        });
        checks.push({
            name: "gate:asyncapi_namespace_depth",
            pass: false,
            detail: "cannot evaluate asyncapi namespace gate without valid asyncapi components.messages",
        });
        checks.push({
            name: "synthetic:asyncapi_namespace_drift_detection",
            pass: false,
            detail: "cannot run synthetic asyncapi namespace drift detector without valid asyncapi scaffold",
        });
    }
    else {
        var expectedIds = sortedUnique(views.asyncapi_messages.map(function (message) { return message.message_id; }));
        var actualIds = sortedUnique(Object.keys(asyncApiDoc.components.messages));
        var expectedPairKeys_1 = sortedUnique(views.asyncapi_messages.map(function (message) {
            var parsed = (0, asyncapi_js_1.parseExternalCallSourceId)(message.source_id);
            var channel = (0, asyncapi_js_1.asyncApiChannelForNamespace)(parsed.namespaceId);
            return "".concat(message.message_id, "|").concat(message.source_id, "|").concat(parsed.namespaceId, "|").concat(parsed.callId, "|").concat(channel);
        }));
        var expectedNamespaceMap = new Map();
        for (var _p = 0, _q = views.asyncapi_messages; _p < _q.length; _p++) {
            var message = _q[_p];
            var parsed = (0, asyncapi_js_1.parseExternalCallSourceId)(message.source_id);
            var channel = (0, asyncapi_js_1.asyncApiChannelForNamespace)(parsed.namespaceId);
            var bucket = (_f = expectedNamespaceMap.get(channel)) !== null && _f !== void 0 ? _f : [];
            bucket.push(message.message_id);
            expectedNamespaceMap.set(channel, bucket);
        }
        var hasMetadata = true;
        var metadataAligned = true;
        var actualPairKeys_1 = [];
        var actualNamespaceMap = new Map();
        for (var _r = 0, _s = Object.entries(asyncApiDoc.components.messages); _r < _s.length; _r++) {
            var _t = _s[_r], messageId = _t[0], message = _t[1];
            if (!isRecord(message)) {
                hasMetadata = false;
                break;
            }
            var metadata = message["x-b2c"];
            if (!isRecord(metadata) ||
                typeof metadata.source_id !== "string" ||
                typeof metadata.source_namespace_id !== "string" ||
                typeof metadata.source_call_id !== "string") {
                hasMetadata = false;
                break;
            }
            var parsed = (0, asyncapi_js_1.parseExternalCallSourceId)(metadata.source_id);
            if (parsed.namespaceId !== metadata.source_namespace_id || parsed.callId !== metadata.source_call_id) {
                metadataAligned = false;
            }
            var channel = (0, asyncapi_js_1.asyncApiChannelForNamespace)(metadata.source_namespace_id);
            actualPairKeys_1.push("".concat(messageId, "|").concat(metadata.source_id, "|").concat(metadata.source_namespace_id, "|").concat(metadata.source_call_id, "|").concat(channel));
            var bucket = (_g = actualNamespaceMap.get(channel)) !== null && _g !== void 0 ? _g : [];
            bucket.push(messageId);
            actualNamespaceMap.set(channel, bucket);
        }
        var channelsRecord = isRecord(asyncApiDoc.channels) ? asyncApiDoc.channels : null;
        var channelShapeOk = channelsRecord !== null;
        var channelListings = new Map();
        if (channelsRecord) {
            for (var _u = 0, _v = Object.entries(channelsRecord); _u < _v.length; _u++) {
                var _w = _v[_u], channel = _w[0], value = _w[1];
                if (!isRecord(value) || !Array.isArray(value.messages)) {
                    channelShapeOk = false;
                    break;
                }
                var messageIds = value.messages.filter(function (item) { return typeof item === "string"; });
                if (messageIds.length !== value.messages.length) {
                    channelShapeOk = false;
                    break;
                }
                var channelMetadata = value["x-b2c"];
                if (!isRecord(channelMetadata) ||
                    typeof channelMetadata.source_namespace_id !== "string" ||
                    (0, asyncapi_js_1.asyncApiChannelForNamespace)(channelMetadata.source_namespace_id) !== channel) {
                    channelShapeOk = false;
                    break;
                }
                channelListings.set(channel, messageIds);
            }
        }
        var namespaceDepthPass = channelShapeOk &&
            metadataAligned &&
            arraysEqual(sortedUnique(actualPairKeys_1), expectedPairKeys_1) &&
            mapStringArrayEqual(actualNamespaceMap, expectedNamespaceMap) &&
            mapStringArrayEqual(channelListings, expectedNamespaceMap);
        checks.push({
            name: "artifact:asyncapi_integrity",
            pass: arraysEqual(actualIds, expectedIds) && hasMetadata,
            detail: "asyncapi messages=".concat(actualIds.length, ", expected=").concat(expectedIds.length),
        });
        checks.push({
            name: "gate:asyncapi_namespace_depth",
            pass: namespaceDepthPass,
            detail: "namespaces expected=".concat(expectedNamespaceMap.size, ", actual=").concat(channelListings.size, ", metadata_aligned=").concat(metadataAligned),
        });
        if (expectedPairKeys_1.length === 0) {
            checks.push({
                name: "synthetic:asyncapi_namespace_drift_detection",
                pass: true,
                detail: "skipped synthetic asyncapi namespace drift detector (no asyncapi messages)",
            });
        }
        else {
            var tamperedAsyncApiDoc = deepCloneJson(asyncApiDoc);
            var tampered = false;
            if (isRecord(tamperedAsyncApiDoc) &&
                isRecord(tamperedAsyncApiDoc.components) &&
                isRecord(tamperedAsyncApiDoc.components.messages)) {
                for (var _x = 0, _y = Object.values(tamperedAsyncApiDoc.components.messages); _x < _y.length; _x++) {
                    var message = _y[_x];
                    if (!isRecord(message)) {
                        continue;
                    }
                    var metadata = message["x-b2c"];
                    if (!isRecord(metadata) || typeof metadata.source_namespace_id !== "string") {
                        continue;
                    }
                    metadata.source_namespace_id = "".concat(metadata.source_namespace_id, "__synthetic_drift");
                    tampered = true;
                    break;
                }
            }
            var tamperedPairKeys = [];
            if (tampered &&
                isRecord(tamperedAsyncApiDoc) &&
                isRecord(tamperedAsyncApiDoc.components) &&
                isRecord(tamperedAsyncApiDoc.components.messages)) {
                for (var _z = 0, _0 = Object.entries(tamperedAsyncApiDoc.components.messages); _z < _0.length; _z++) {
                    var _1 = _0[_z], messageId = _1[0], message = _1[1];
                    if (!isRecord(message)) {
                        continue;
                    }
                    var metadata = message["x-b2c"];
                    if (!isRecord(metadata) ||
                        typeof metadata.source_id !== "string" ||
                        typeof metadata.source_namespace_id !== "string" ||
                        typeof metadata.source_call_id !== "string") {
                        continue;
                    }
                    var channel = (0, asyncapi_js_1.asyncApiChannelForNamespace)(metadata.source_namespace_id);
                    tamperedPairKeys.push("".concat(messageId, "|").concat(metadata.source_id, "|").concat(metadata.source_namespace_id, "|").concat(metadata.source_call_id, "|").concat(channel));
                }
            }
            var driftDetected = tampered && !arraysEqual(sortedUnique(tamperedPairKeys), expectedPairKeys_1);
            checks.push({
                name: "synthetic:asyncapi_namespace_drift_detection",
                pass: driftDetected,
                detail: driftDetected
                    ? "tampered asyncapi namespace metadata was detected by namespace-depth gate"
                    : "tampered asyncapi namespace metadata was not detected by namespace-depth gate",
            });
        }
    }
    var udsDoc = parseJsonArtifact(first.artifacts, "agent/schema/uds.json");
    if (!isRecord(udsDoc) || !Array.isArray(udsDoc.types)) {
        checks.push({
            name: "artifact:uds_integrity",
            pass: false,
            detail: "uds scaffold missing types array",
        });
    }
    else {
        var expectedTypeIds = sortedUnique(views.uds_types.map(function (item) { return item.id; }));
        var actualTypeIds = sortedUnique(udsDoc.types.filter(isRecord).map(function (item) { return item.id; }).filter(function (id) { return typeof id === "string"; }));
        var metadataPresent = udsDoc.types
            .filter(isRecord)
            .every(function (item) { return Object.prototype.hasOwnProperty.call(item, "source_pointer"); });
        checks.push({
            name: "artifact:uds_integrity",
            pass: arraysEqual(actualTypeIds, expectedTypeIds) && metadataPresent,
            detail: "uds types=".concat(actualTypeIds.length, ", expected=").concat(expectedTypeIds.length),
        });
    }
    var depgraphDoc = parseJsonArtifact(first.artifacts, "agent/depgraph.json");
    if (!isRecord(depgraphDoc) || !Array.isArray(depgraphDoc.nodes) || !Array.isArray(depgraphDoc.edges)) {
        checks.push({
            name: "artifact:depgraph_integrity",
            pass: false,
            detail: "depgraph missing nodes/edges arrays",
        });
    }
    else {
        var nodeIds = depgraphDoc.nodes
            .filter(isRecord)
            .map(function (node) { return node.id; })
            .filter(function (id) { return typeof id === "string"; })
            .sort(function (a, b) { return a.localeCompare(b); });
        var expectedNodeIds = sortedUnique(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], inventory.entries.map(function (entry) { return entry.id; }), true), views.acceptance_scenarios.map(function (scenario) { return "view:acceptance_scenario:".concat(scenario.scenario_id); }), true), views.openapi_operations.map(function (operation) { return "view:openapi_operation:".concat(operation.operation_id); }), true), views.asyncapi_messages.map(function (message) { return "view:asyncapi_message:".concat(message.message_id); }), true), views.uds_types.map(function (udsType) { return "view:uds_type:".concat(udsType.id); }), true));
        var edgeShapeOk = depgraphDoc.edges.filter(isRecord).every(function (edge) {
            return (typeof edge.from_id === "string" &&
                typeof edge.to_id === "string" &&
                typeof edge.kind === "string" &&
                typeof edge.source === "string");
        });
        checks.push({
            name: "artifact:depgraph_integrity",
            pass: arraysEqual(nodeIds, expectedNodeIds) && edgeShapeOk,
            detail: "depgraph nodes=".concat(nodeIds.length, ", expected=").concat(expectedNodeIds.length),
        });
    }
    var rtmArtifact = first.artifacts.find(function (artifact) { return artifact.path === "agent/rtm.csv"; });
    if (!rtmArtifact) {
        checks.push({
            name: "artifact:rtm_integrity",
            pass: false,
            detail: "rtm artifact missing",
        });
    }
    else {
        var lines = rtmArtifact.content.trimEnd().split("\n");
        var rows = lines.slice(1).map(function (line) { return csvCell(line); });
        var actualTriples = rows
            .map(function (row) { var _a, _b, _c; return "".concat((_a = row[0]) !== null && _a !== void 0 ? _a : "", "|").concat((_b = row[2]) !== null && _b !== void 0 ? _b : "", "|").concat((_c = row[1]) !== null && _c !== void 0 ? _c : ""); })
            .sort(function (a, b) { return a.localeCompare(b); });
        var expectedTriples = inventory.entries
            .map(function (entry) { return "".concat(entry.id, "|").concat(entry.pointer, "|").concat(entry.entity_class); })
            .sort(function (a, b) { return a.localeCompare(b); });
        var statusSet = new Set(rows.map(function (row) { var _a; return (_a = row[8]) !== null && _a !== void 0 ? _a : ""; }));
        checks.push({
            name: "artifact:rtm_integrity",
            pass: arraysEqual(actualTriples, expectedTriples) && statusSet.size > 0,
            detail: "rtm rows=".concat(rows.length, ", statuses=").concat(__spreadArray([], statusSet, true).sort().join(",")),
        });
    }
    checks.push.apply(checks, first.checks);
    checks.push.apply(checks, second.checks.map(function (check) { return (__assign(__assign({}, check), { name: "".concat(check.name, ":rerun") })); }));
    var idempotency = compareArtifactSets(artifactHashes(first.artifacts), artifactHashes(second.artifacts));
    checks.push({
        name: "idempotency",
        pass: idempotency.pass,
        detail: idempotency.detail,
    });
    return {
        ok: checks.every(function (check) { return check.pass; }),
        checks: checks,
    };
}
