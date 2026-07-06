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
exports.emitRtmScaffold = emitRtmScaffold;
var RTM_HEADER = [
    "entity_id",
    "entity_class",
    "pointer",
    "view_refs",
    "artifact_refs",
    "code_module",
    "test_id",
    "pipeline_evidence",
    "status",
    "owner",
    "notes",
];
function toCsvCell(value) {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return "\"".concat(value.replaceAll('"', '""'), "\"");
    }
    return value;
}
function sanitizeSegment(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function artifactRefsForViews(viewRefs) {
    var refs = new Set();
    for (var _i = 0, viewRefs_1 = viewRefs; _i < viewRefs_1.length; _i++) {
        var viewRef = viewRefs_1[_i];
        if (viewRef.startsWith("acceptance_scenario:")) {
            refs.add("agent/acceptance/*.feature");
            continue;
        }
        if (viewRef.startsWith("openapi_operation:")) {
            refs.add("agent/contracts/openapi-incoming.json");
            refs.add("agent/contracts/openapi-outgoing.json");
            continue;
        }
        if (viewRef.startsWith("asyncapi_message:")) {
            refs.add("agent/contracts/asyncapi.json");
            continue;
        }
        if (viewRef.startsWith("uds_type:")) {
            refs.add("agent/schema/uds.json");
            refs.add("agent/schema/uds.yaml");
            continue;
        }
        if (viewRef.startsWith("threat_actor:")) {
            refs.add("docs/security/threat-model.md");
            refs.add("agent/security/threat-index.json");
            continue;
        }
        if (viewRef.startsWith("data_flow:")) {
            refs.add("docs/security/threat-model.md");
            refs.add("docs/privacy/dpia-lite.md");
            refs.add("agent/security/threat-index.json");
            refs.add("agent/security/dpia-index.json");
            continue;
        }
        if (viewRef.startsWith("pii_category:")) {
            refs.add("docs/privacy/dpia-lite.md");
            refs.add("agent/security/dpia-index.json");
            continue;
        }
        if (viewRef.startsWith("migration_adr:")) {
            refs.add("docs/adr/*.md");
            refs.add("agent/adr-index.json");
        }
    }
    return __spreadArray([], refs, true).sort(function (a, b) { return a.localeCompare(b); });
}
function buildViewIndex(views) {
    var index = new Map();
    var push = function (sourceId, ref) {
        var _a;
        var current = (_a = index.get(sourceId)) !== null && _a !== void 0 ? _a : [];
        current.push(ref);
        index.set(sourceId, current);
    };
    for (var _i = 0, _a = views.acceptance_scenarios; _i < _a.length; _i++) {
        var scenario = _a[_i];
        push(scenario.workflow_ref, "acceptance_scenario:".concat(scenario.scenario_id));
    }
    for (var _b = 0, _c = views.openapi_operations; _b < _c.length; _b++) {
        var operation = _c[_b];
        push(operation.source_id, "openapi_operation:".concat(operation.operation_id));
    }
    for (var _d = 0, _e = views.asyncapi_messages; _d < _e.length; _d++) {
        var message = _e[_d];
        push(message.source_id, "asyncapi_message:".concat(message.message_id));
    }
    for (var _f = 0, _g = views.uds_types; _f < _g.length; _f++) {
        var udsType = _g[_f];
        push(udsType.user_type_ref, "uds_type:".concat(udsType.id));
    }
    for (var _h = 0, _j = views.actors; _h < _j.length; _h++) {
        var actor = _j[_h];
        for (var _k = 0, _l = actor.privacy_role_refs; _k < _l.length; _k++) {
            var role = _l[_k];
            push(role, "threat_actor:".concat(actor.actor_id));
        }
    }
    for (var _m = 0, _o = views.data_flows; _m < _o.length; _m++) {
        var flow = _o[_m];
        push(flow.source_id, "data_flow:".concat(flow.flow_id));
    }
    for (var _p = 0, _q = views.pii_categories; _p < _q.length; _p++) {
        var pii = _q[_p];
        push(pii.field_id, "pii_category:".concat(pii.category));
    }
    for (var _r = 0, _s = views.migration_adrs; _r < _s.length; _r++) {
        var adr = _s[_r];
        push(adr.entity_id, "migration_adr:".concat(adr.adr_id));
    }
    for (var _t = 0, _u = index.entries(); _t < _u.length; _t++) {
        var _v = _u[_t], sourceId = _v[0], refs = _v[1];
        refs.sort();
        index.set(sourceId, refs);
    }
    return index;
}
function emitRtmScaffold(inventory, views) {
    var viewIndex = buildViewIndex(views);
    var rows = inventory.entries.map(function (entry) {
        var _a;
        var viewRefs = (_a = viewIndex.get(entry.id)) !== null && _a !== void 0 ? _a : [];
        var artifactRefs = artifactRefsForViews(viewRefs);
        var columns = [
            entry.id,
            entry.entity_class,
            entry.pointer,
            viewRefs.join(";"),
            artifactRefs.join(";"),
            "m2/".concat(entry.entity_class.replace(/\./g, "/"), "/").concat(sanitizeSegment(entry.id)),
            "accept:m2:".concat(sanitizeSegment(entry.id)),
            "inventory:".concat(entry.pointer),
            viewRefs.length > 0 ? "mapped" : "unmapped",
            "pending-owner",
            "pending",
        ];
        return columns.map(toCsvCell).join(",");
    });
    return [
        {
            path: "agent/rtm.csv",
            content: "".concat(RTM_HEADER.join(","), "\n").concat(rows.join("\n"), "\n"),
        },
    ];
}
