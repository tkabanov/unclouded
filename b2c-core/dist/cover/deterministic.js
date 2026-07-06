"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDeterministicCover = buildDeterministicCover;
exports.expectedDeterministicInventoryIds = expectedDeterministicInventoryIds;
var DETERMINISTIC_CLASSES = new Set([
    "settings_singleton",
    "style",
    "color_token",
    "font_token",
    "plugin",
]);
function buildDeterministicCover(inventory) {
    var coveredIds = inventory.entries
        .filter(function (entry) { return DETERMINISTIC_CLASSES.has(entry.entity_class); })
        .map(function (entry) { return entry.id; })
        .sort();
    return {
        slice_id: "_deterministic",
        covered_ids: coveredIds,
        prose_template: [
            "Deterministic cover owns settings client_safe singletons and style/token/plugin collections.",
        ],
    };
}
function expectedDeterministicInventoryIds(inventory) {
    return inventory.entries
        .filter(function (entry) { return DETERMINISTIC_CLASSES.has(entry.entity_class); })
        .map(function (entry) { return entry.id; })
        .sort();
}
