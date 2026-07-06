"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitAdrScaffold = emitAdrScaffold;
function sanitizeSegment(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function renderAdr(adrId, entityId) {
    return [
        "---",
        "id: ".concat(adrId),
        "status: pending-m7",
        "entity_id: ".concat(entityId),
        "---",
        "",
        "# ".concat(adrId),
        "",
        "## Context",
        "",
        "Deterministic scaffold generated in M2 phase 6 baseline.",
        "",
        "## Decision",
        "",
        "_pending-m7_",
        "",
        "## Alternatives",
        "",
        "_pending-m7_",
        "",
        "## Consequences",
        "",
        "_pending-m7_",
        "",
    ].join("\n");
}
function emitAdrScaffold(views) {
    var files = views.migration_adrs
        .map(function (adr) { return ({
        path: "docs/adr/".concat(sanitizeSegment(adr.adr_id), ".md"),
        content: renderAdr(adr.adr_id, adr.entity_id),
    }); })
        .sort(function (a, b) { return a.path.localeCompare(b.path); });
    files.push({
        path: "agent/adr-index.json",
        content: "".concat(JSON.stringify(views.migration_adrs, null, 2), "\n"),
    });
    return files;
}
