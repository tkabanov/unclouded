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
exports.buildDepgraphDoc = buildDepgraphDoc;
exports.emitDepgraphScaffold = emitDepgraphScaffold;
function stableJson(value) {
    return "".concat(JSON.stringify(value, null, 2), "\n");
}
function sortedEdges(edges) {
    return edges.slice().sort(function (left, right) {
        if (left.from_id !== right.from_id) {
            return left.from_id.localeCompare(right.from_id);
        }
        if (left.to_id !== right.to_id) {
            return left.to_id.localeCompare(right.to_id);
        }
        if (left.kind !== right.kind) {
            return left.kind.localeCompare(right.kind);
        }
        return left.source.localeCompare(right.source);
    });
}
function buildDepgraphDoc(inventory, refs, views) {
    var inventoryNodes = inventory.entries
        .map(function (entry) { return ({
        id: entry.id,
        pointer: entry.pointer,
        entity_class: entry.entity_class,
    }); })
        .sort(function (a, b) { return a.id.localeCompare(b.id); });
    var viewNodes = __spreadArray(__spreadArray(__spreadArray(__spreadArray([], views.acceptance_scenarios.map(function (scenario) { return ({
        id: "view:acceptance_scenario:".concat(scenario.scenario_id),
        pointer: "/agent/acceptance/".concat(scenario.scenario_id, ".feature"),
        entity_class: "view.acceptance_scenario",
    }); }), true), views.openapi_operations.map(function (operation) { return ({
        id: "view:openapi_operation:".concat(operation.operation_id),
        pointer: "/agent/contracts/openapi/".concat(operation.operation_id),
        entity_class: "view.openapi_operation",
    }); }), true), views.asyncapi_messages.map(function (message) { return ({
        id: "view:asyncapi_message:".concat(message.message_id),
        pointer: "/agent/contracts/asyncapi/".concat(message.message_id),
        entity_class: "view.asyncapi_message",
    }); }), true), views.uds_types.map(function (udsType) { return ({
        id: "view:uds_type:".concat(udsType.id),
        pointer: "/agent/schema/uds/".concat(udsType.id),
        entity_class: "view.uds_type",
    }); }), true).sort(function (a, b) { return a.id.localeCompare(b.id); });
    var nodeById = new Map();
    for (var _i = 0, _a = __spreadArray(__spreadArray([], inventoryNodes, true), viewNodes, true); _i < _a.length; _i++) {
        var node = _a[_i];
        if (!nodeById.has(node.id)) {
            nodeById.set(node.id, node);
        }
    }
    var nodes = __spreadArray([], nodeById.values(), true).sort(function (a, b) { return a.id.localeCompare(b.id); });
    var edges = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], refs.map(function (edge) { return ({
        from_id: edge.from_id,
        to_id: edge.to_id,
        kind: edge.edge_kind,
        source: "refs",
    }); }), true), views.acceptance_scenarios.map(function (scenario) { return ({
        from_id: scenario.workflow_ref,
        to_id: "view:acceptance_scenario:".concat(scenario.scenario_id),
        kind: "drives_acceptance_scenario",
        source: "views",
    }); }), true), views.openapi_operations.map(function (operation) { return ({
        from_id: operation.source_id,
        to_id: "view:openapi_operation:".concat(operation.operation_id),
        kind: "drives_openapi_operation",
        source: "views",
    }); }), true), views.asyncapi_messages.map(function (message) { return ({
        from_id: message.source_id,
        to_id: "view:asyncapi_message:".concat(message.message_id),
        kind: "drives_asyncapi_message",
        source: "views",
    }); }), true), views.uds_types.map(function (udsType) { return ({
        from_id: udsType.user_type_ref,
        to_id: "view:uds_type:".concat(udsType.id),
        kind: "drives_uds_type",
        source: "views",
    }); }), true);
    var sorted = sortedEdges(edges);
    return {
        schema: "m2.phase6.depgraph.v1",
        generated_from: "inventory+refs+views",
        node_count: nodes.length,
        edge_count: sorted.length,
        nodes: nodes,
        edges: sorted,
    };
}
function emitDepgraphScaffold(inventory, refs, views) {
    var doc = buildDepgraphDoc(inventory, refs, views);
    return [
        {
            path: "agent/depgraph.json",
            content: stableJson(doc),
        },
    ];
}
