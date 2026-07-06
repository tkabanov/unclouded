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
exports.buildSlices = buildSlices;
var index_js_1 = require("./utils/index.js");
var CONTEXT_BUDGET_TOKENS = 4000;
var CTX_BUDGET = 80000;
var SLICE_BUDGET = Math.floor(CTX_BUDGET * 0.6); // 48k
var PAYLOAD_BUDGET = SLICE_BUDGET - CONTEXT_BUDGET_TOKENS; // 44k
function estimateTokens(value) {
    var chars = JSON.stringify(value).length;
    return Math.ceil((chars / 4) * 1.1);
}
function valueAtPointer(root, pointer) {
    var parts = pointer
        .split("/")
        .slice(1)
        .map(function (part) { return part.replaceAll("~1", "/").replaceAll("~0", "~"); });
    var cursor = root;
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var part = parts_1[_i];
        if (Array.isArray(cursor)) {
            var idx = Number(part);
            if (!Number.isInteger(idx)) {
                return undefined;
            }
            cursor = cursor[idx];
            continue;
        }
        var record = (0, index_js_1.getRecord)(cursor);
        if (!record) {
            return undefined;
        }
        cursor = record[part];
    }
    return cursor;
}
function idsUnderPointer(inventory, pointerPrefix) {
    var ids = inventory.entries
        .filter(function (entry) { return entry.pointer === pointerPrefix || entry.pointer.startsWith("".concat(pointerPrefix, "/")); })
        .map(function (entry) { return entry.id; });
    ids.sort();
    return ids;
}
function parentChainForPointer(pointer) {
    var _a;
    var parts = pointer.split("/").filter(Boolean);
    var chain = [];
    if (parts.length < 2) {
        return chain;
    }
    for (var i = parts.length - 1; i >= 1 && chain.length < 3; i -= 2) {
        chain.push((_a = parts[i]) !== null && _a !== void 0 ? _a : "");
    }
    return chain.filter(function (item) { return item.length > 0; });
}
function pointerToSlicePath(pointer, pageKey) {
    var parts = pointer.split("/").filter(Boolean);
    var pageIdx = parts.findIndex(function (part) { return part === "pages"; });
    if (pageIdx < 0 || parts[pageIdx + 1] === undefined) {
        return "".concat(pageKey, "/__root");
    }
    var suffix = parts.slice(pageIdx + 2).join("/");
    return suffix.length > 0 ? "".concat(pageKey, "/").concat(suffix) : "".concat(pageKey, "/__root");
}
function pushSlice(context, slice) {
    context.seq += 1;
    context.slices.push(__assign(__assign({}, slice), { slice_seq: context.seq }));
}
function splitWorkflows(context, workflowsPointer, parentSliceId) {
    var _a, _b;
    var workflows = (0, index_js_1.getRecord)(valueAtPointer(context.root, workflowsPointer));
    if (!workflows) {
        return;
    }
    var entries = Object.entries(workflows).sort(function (_a, _b) {
        var a = _a[0];
        var b = _b[0];
        return a.localeCompare(b);
    });
    if (entries.length === 0) {
        return;
    }
    var chunks = [];
    var currentChunk = [];
    var currentTokens = 0;
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var pair = entries_1[_i];
        var token = estimateTokens(pair[1]);
        if (currentChunk.length > 0 && currentTokens + token > PAYLOAD_BUDGET) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentTokens = 0;
        }
        currentChunk.push(pair);
        currentTokens += token;
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }
    var partNames = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (var index = 0; index < chunks.length; index += 1) {
        var part = (_a = chunks[index]) !== null && _a !== void 0 ? _a : [];
        var partObject = {};
        for (var _c = 0, part_1 = part; _c < part_1.length; _c++) {
            var _d = part_1[_c], key = _d[0], value = _d[1];
            partObject[key] = value;
        }
        var suffix = (_b = partNames[index]) !== null && _b !== void 0 ? _b : String(index + 1);
        var sliceId = "".concat(context.pageKey, "/workflows/__part_").concat(suffix);
        pushSlice(context, {
            slice_id: sliceId,
            parent_slice_id: parentSliceId,
            slice_kind: "sub_workflow_group",
            entity_id: context.pageEntityId,
            pointer: workflowsPointer,
            entities: idsUnderPointer(context.inventory, workflowsPointer),
            tokens_estimate: Math.min(SLICE_BUDGET, estimateTokens(partObject) + 1800),
            neighbour_context: {
                parent_summary: "Workflow block on page ".concat(context.pageKey),
                referenced_ids: [context.pageEntityId],
            },
        });
    }
}
function splitElementGroup(context, elementsPointer, parentSliceId, parentEntityId) {
    var _a, _b;
    var elements = (0, index_js_1.getRecord)(valueAtPointer(context.root, elementsPointer));
    if (!elements) {
        return;
    }
    var entries = Object.entries(elements).sort(function (_a, _b) {
        var a = _a[0];
        var b = _b[0];
        return a.localeCompare(b);
    });
    var largeChildren = [];
    var smallChildren = [];
    for (var _i = 0, entries_2 = entries; _i < entries_2.length; _i++) {
        var _c = entries_2[_i], key = _c[0], value = _c[1];
        var tokens = estimateTokens(value);
        if (tokens > PAYLOAD_BUDGET) {
            largeChildren.push([key, value]);
        }
        else {
            smallChildren.push([key, value]);
        }
    }
    if (smallChildren.length > 0) {
        var groupedObject = {};
        for (var _d = 0, smallChildren_1 = smallChildren; _d < smallChildren_1.length; _d++) {
            var _e = smallChildren_1[_d], key = _e[0], value = _e[1];
            groupedObject[key] = value;
            var elementId = (_a = value.id) !== null && _a !== void 0 ? _a : key;
            context.elementIdToSlice.set(elementId, "".concat(pointerToSlicePath(elementsPointer, context.pageKey), "/__remaining_children"));
        }
        var sliceId = "".concat(pointerToSlicePath(elementsPointer, context.pageKey), "/__remaining_children");
        pushSlice(context, {
            slice_id: sliceId,
            parent_slice_id: parentSliceId,
            slice_kind: "sub_element_group",
            entity_id: parentEntityId,
            pointer: elementsPointer,
            entities: idsUnderPointer(context.inventory, elementsPointer),
            tokens_estimate: Math.min(SLICE_BUDGET, estimateTokens(groupedObject) + 2400),
            neighbour_context: {
                parent_summary: "Element group under ".concat(parentEntityId),
                referenced_ids: [context.pageEntityId, parentEntityId],
            },
        });
    }
    for (var _f = 0, largeChildren_1 = largeChildren; _f < largeChildren_1.length; _f++) {
        var _g = largeChildren_1[_f], childKey = _g[0], childValue = _g[1];
        var childPointer = "".concat(elementsPointer, "/").concat(childKey);
        var childId = (_b = childValue.id) !== null && _b !== void 0 ? _b : childKey;
        var childSliceId = pointerToSlicePath(childPointer, context.pageKey);
        context.elementIdToSlice.set(childId, childSliceId);
        var childElementsPointer = "".concat(childPointer, "/elements");
        var childElements = (0, index_js_1.getRecord)(valueAtPointer(context.root, childElementsPointer));
        if (childElements && estimateTokens(childValue) > PAYLOAD_BUDGET) {
            splitElementGroup(context, childElementsPointer, parentSliceId, childId);
            continue;
        }
        pushSlice(context, {
            slice_id: childSliceId,
            parent_slice_id: parentSliceId,
            slice_kind: "sub_element_group",
            entity_id: childId,
            pointer: childPointer,
            entities: idsUnderPointer(context.inventory, childPointer),
            tokens_estimate: Math.min(SLICE_BUDGET, estimateTokens(childValue) + 2400),
            neighbour_context: {
                parent_summary: "Element ".concat(childId, " nested in page ").concat(context.pageKey),
                referenced_ids: [context.pageEntityId, parentEntityId],
            },
        });
    }
}
function annotateWorkflowTriggerEnvelope(context) {
    var _a, _b, _c, _d, _e, _f, _g;
    for (var _i = 0, _h = context.slices; _i < _h.length; _i++) {
        var slice = _h[_i];
        if (slice.slice_kind !== "sub_workflow_group") {
            continue;
        }
        var workflows = (0, index_js_1.getRecord)(valueAtPointer(context.root, slice.pointer));
        if (!workflows) {
            continue;
        }
        var _loop_1 = function (workflow) {
            var wfRecord = (0, index_js_1.getRecord)(workflow);
            if (!wfRecord) {
                return "continue";
            }
            var properties = (0, index_js_1.getRecord)(wfRecord.properties);
            var triggerElementId = (0, index_js_1.getString)(properties === null || properties === void 0 ? void 0 : properties.element_id);
            if (!triggerElementId) {
                return "continue";
            }
            var targetSlice = context.elementIdToSlice.get(triggerElementId);
            if (!targetSlice || targetSlice === slice.slice_id) {
                return "continue";
            }
            var elementEntry = context.inventory.entries.find(function (entry) { return entry.id === triggerElementId; });
            var elementPointer = (_a = elementEntry === null || elementEntry === void 0 ? void 0 : elementEntry.pointer) !== null && _a !== void 0 ? _a : "";
            var elementValue = elementPointer
                ? (0, index_js_1.getRecord)(valueAtPointer(context.root, elementPointer))
                : undefined;
            slice.neighbour_context = {
                parent_summary: (_c = (_b = slice.neighbour_context) === null || _b === void 0 ? void 0 : _b.parent_summary) !== null && _c !== void 0 ? _c : "Workflow block on page ".concat(context.pageKey),
                referenced_ids: Array.from(new Set(__spreadArray(__spreadArray([], ((_e = (_d = slice.neighbour_context) === null || _d === void 0 ? void 0 : _d.referenced_ids) !== null && _e !== void 0 ? _e : []), true), [
                    context.pageEntityId,
                    triggerElementId,
                ], false))),
                trigger_envelope: {
                    pointer: elementPointer,
                    element_type: (_f = (0, index_js_1.getString)(elementValue === null || elementValue === void 0 ? void 0 : elementValue.type)) !== null && _f !== void 0 ? _f : "Unknown",
                    custom_state_keys: Object.keys((_g = (0, index_js_1.getRecord)(elementValue === null || elementValue === void 0 ? void 0 : elementValue.custom_states)) !== null && _g !== void 0 ? _g : {}),
                    parent_chain: parentChainForPointer(elementPointer).slice(0, 3),
                },
            };
            return "break";
        };
        for (var _j = 0, _k = Object.values(workflows); _j < _k.length; _j++) {
            var workflow = _k[_j];
            var state_1 = _loop_1(workflow);
            if (state_1 === "break")
                break;
        }
    }
}
function buildPageSlices(root, inventory, pageEntityId, pageKey, pagePointer) {
    var _a;
    var pageValue = valueAtPointer(root, pagePointer);
    var rootTokens = estimateTokens(pageValue);
    var context = {
        root: root,
        inventory: inventory,
        pageKey: pageKey,
        pageEntityId: pageEntityId,
        pagePointer: pagePointer,
        slices: [],
        seq: 0,
        elementIdToSlice: new Map(),
    };
    var rootSliceId = "".concat(pageKey, "/__root");
    var rootEntities = idsUnderPointer(inventory, pagePointer);
    if (rootTokens <= SLICE_BUDGET) {
        pushSlice(context, {
            slice_id: rootSliceId,
            slice_kind: "root",
            entity_id: pageEntityId,
            pointer: pagePointer,
            entities: rootEntities,
            tokens_estimate: rootTokens,
        });
        return context.slices;
    }
    var pageRecord = (_a = (0, index_js_1.getRecord)(pageValue)) !== null && _a !== void 0 ? _a : {};
    var rootPayload = {};
    for (var _i = 0, _b = Object.entries(pageRecord); _i < _b.length; _i++) {
        var _c = _b[_i], key = _c[0], value = _c[1];
        if (key === "elements" || key === "workflows") {
            continue;
        }
        rootPayload[key] = value;
    }
    pushSlice(context, {
        slice_id: rootSliceId,
        slice_kind: "root",
        entity_id: pageEntityId,
        pointer: pagePointer,
        entities: rootEntities,
        tokens_estimate: Math.min(SLICE_BUDGET, estimateTokens(rootPayload) + 1200),
        neighbour_context: {
            parent_summary: "Page root ".concat(pageKey),
            referenced_ids: [pageEntityId],
        },
    });
    splitWorkflows(context, "".concat(pagePointer, "/workflows"), rootSliceId);
    splitElementGroup(context, "".concat(pagePointer, "/elements"), rootSliceId, pageEntityId);
    annotateWorkflowTriggerEnvelope(context);
    return context.slices;
}
function buildSlices(root, inventory) {
    var _a;
    var pageEntries = inventory.entries.filter(function (entry) { return entry.entity_class === "page"; });
    var slices = [];
    for (var _i = 0, pageEntries_1 = pageEntries; _i < pageEntries_1.length; _i++) {
        var pageEntry = pageEntries_1[_i];
        var pageKey = (_a = pageEntry.pointer.split("/").filter(Boolean)[1]) !== null && _a !== void 0 ? _a : pageEntry.id;
        var built = buildPageSlices(root, inventory, pageEntry.id, pageKey, pageEntry.pointer);
        slices.push.apply(slices, built);
    }
    slices.sort(function (a, b) {
        if (a.entity_id !== b.entity_id) {
            return a.entity_id.localeCompare(b.entity_id);
        }
        return a.slice_seq - b.slice_seq;
    });
    for (var _b = 0, slices_1 = slices; _b < slices_1.length; _b++) {
        var slice = slices_1[_b];
        if (slice.tokens_estimate > SLICE_BUDGET) {
            throw new Error("Slice budget exceeded for ".concat(slice.slice_id, ": ").concat(slice.tokens_estimate));
        }
        var contextTokens = slice.neighbour_context ? estimateTokens(slice.neighbour_context) : 0;
        if (contextTokens > CONTEXT_BUDGET_TOKENS) {
            throw new Error("Neighbour context budget exceeded for ".concat(slice.slice_id, ": ").concat(contextTokens));
        }
    }
    return slices;
}
