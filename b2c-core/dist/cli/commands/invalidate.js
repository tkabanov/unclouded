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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
exports.runInvalidateCommand = runInvalidateCommand;
var node_path_1 = require("node:path");
var node_process_1 = require("node:process");
var index_js_1 = require("../../m2/views/index.js");
var depgraph_js_1 = require("../../m2/emitters/depgraph.js");
var index_js_2 = require("../../utils/index.js");
var phase6_common_js_1 = require("./phase6-common.js");
function parseArgs(args) {
    var target = null;
    var appId = null;
    var consumed = new Set();
    for (var index = 0; index < args.length; index += 1) {
        var arg = args[index];
        if (arg === "--target") {
            var value = args[index + 1];
            if (!value || value.startsWith("-")) {
                throw new Error("Usage: b2c invalidate <id> [--target <path-or-app>] [--app-id <id>] [--json]");
            }
            target = value;
            consumed.add(index);
            consumed.add(index + 1);
            index += 1;
            continue;
        }
        if (arg === "--app-id") {
            var value = args[index + 1];
            if (!value || value.startsWith("-")) {
                throw new Error("Usage: b2c invalidate <id> [--target <path-or-app>] [--app-id <id>] [--json]");
            }
            appId = value;
            consumed.add(index);
            consumed.add(index + 1);
            index += 1;
            continue;
        }
    }
    if (target && appId) {
        throw new Error("Conflicting selectors: choose either --target or --app-id for invalidate.");
    }
    var id = args.find(function (arg, index) { return !arg.startsWith("-") && !consumed.has(index); });
    if (!id) {
        throw new Error("Usage: b2c invalidate <id> [--target <path-or-app>] [--app-id <id>] [--json]");
    }
    return {
        id: id,
        target: appId ? (0, node_path_1.join)("apps", appId) : (target !== null && target !== void 0 ? target : "b2c"),
        json: args.includes("--json"),
    };
}
function impactedIds(seedId, depgraph) {
    var _a;
    var nodeIds = new Set(depgraph.nodes.map(function (node) { return node.id; }));
    if (!nodeIds.has(seedId)) {
        return [];
    }
    var forward = new Map();
    for (var _i = 0, _b = depgraph.edges; _i < _b.length; _i++) {
        var edge = _b[_i];
        var bucket = (_a = forward.get(edge.from_id)) !== null && _a !== void 0 ? _a : new Set();
        bucket.add(edge.to_id);
        forward.set(edge.from_id, bucket);
    }
    var visited = new Set([seedId]);
    var queue = [seedId];
    while (queue.length > 0) {
        var current = queue.shift();
        var children = forward.get(current);
        if (!children) {
            continue;
        }
        for (var _c = 0, children_1 = children; _c < children_1.length; _c++) {
            var child = children_1[_c];
            if (!nodeIds.has(child) || visited.has(child)) {
                continue;
            }
            visited.add(child);
            queue.push(child);
        }
    }
    return __spreadArray([], visited, true).sort(function (a, b) { return a.localeCompare(b); });
}
function runInvalidateCommand(context) {
    return __awaiter(this, void 0, void 0, function () {
        var parsed, targetDir, _a, inventory, refs, depgraph, impacted, output;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    parsed = parseArgs(context.args);
                    return [4 /*yield*/, (0, phase6_common_js_1.resolvePhase6TargetDir)(context.workspaceRoot, parsed.target)];
                case 1:
                    targetDir = _b.sent();
                    return [4 /*yield*/, Promise.all([(0, phase6_common_js_1.loadInventoryFromTarget)(targetDir), (0, phase6_common_js_1.loadRefsFromTarget)(targetDir)])];
                case 2:
                    _a = _b.sent(), inventory = _a[0], refs = _a[1];
                    depgraph = (0, depgraph_js_1.buildDepgraphDoc)(inventory, refs, (0, index_js_1.buildM2Views)(inventory));
                    impacted = impactedIds(parsed.id, depgraph);
                    output = {
                        schema: "b2c.invalidate.v1",
                        command: "invalidate",
                        requested_id: parsed.id,
                        target: targetDir,
                        impacted_ids: impacted,
                        impacted_count: impacted.length,
                        generated_from: "depgraph",
                    };
                    return [4 /*yield*/, (0, index_js_2.writeJsonFile)((0, node_path_1.join)(targetDir, "state", "invalidation.json"), output)];
                case 3:
                    _b.sent();
                    if (parsed.json) {
                        node_process_1.default.stdout.write("".concat(JSON.stringify(__assign({ ok: impacted.length > 0 }, output), null, 2), "\n"));
                        return [2 /*return*/];
                    }
                    if (impacted.length === 0) {
                        node_process_1.default.stdout.write("invalidate: id \"".concat(parsed.id, "\" not found in inventory for ").concat(targetDir, ".\n"));
                        return [2 /*return*/];
                    }
                    node_process_1.default.stdout.write("invalidate: marked ".concat(impacted.length, " id(s) from \"").concat(parsed.id, "\" under ").concat(targetDir, "/state.\n"));
                    return [2 /*return*/];
            }
        });
    });
}
