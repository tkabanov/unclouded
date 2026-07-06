"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_HEADER_BUDGET = void 0;
exports.runIngest = runIngest;
var node_path_1 = require("node:path");
var deterministic_js_1 = require("./cover/deterministic.js");
var inventory_js_1 = require("./inventory.js");
var parse_js_1 = require("./parse.js");
var refs_js_1 = require("./refs.js");
var resolver_js_1 = require("./resolver.js");
var slicer_js_1 = require("./slicer.js");
var index_js_1 = require("./utils/index.js");
var validate_js_1 = require("./validate.js");
exports.DEFAULT_HEADER_BUDGET = {
    ctx_budget: 80000,
    header_budget: 24000,
    response_budget: 8000,
    slice_budget: 48000,
};
function collectErrors() {
    var lists = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        lists[_i] = arguments[_i];
    }
    return lists.flatMap(function (item) { return item.errors; });
}
function writeSlices(outputRoot, slices) {
    return __awaiter(this, void 0, void 0, function () {
        var slicesDir, _i, slices_1, slice, safeName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    slicesDir = (0, node_path_1.join)(outputRoot, "index", "slices");
                    return [4 /*yield*/, (0, index_js_1.removeDirIfExists)(slicesDir)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, index_js_1.ensureDir)(slicesDir)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, index_js_1.writeJsonFile)((0, node_path_1.join)(slicesDir, "_all.json"), slices)];
                case 3:
                    _a.sent();
                    _i = 0, slices_1 = slices;
                    _a.label = 4;
                case 4:
                    if (!(_i < slices_1.length)) return [3 /*break*/, 7];
                    slice = slices_1[_i];
                    safeName = slice.slice_id.replaceAll("/", "__");
                    return [4 /*yield*/, (0, index_js_1.writeJsonFile)((0, node_path_1.join)(slicesDir, "".concat(safeName, ".json")), slice)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function runIngest(inputPath, outputRoot) {
    return __awaiter(this, void 0, void 0, function () {
        var parsed, inventoryBuild, inventory, lint, keys, refs, resolver, slices, deterministic, validationErrors;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, parse_js_1.parseBubbleFile)(inputPath)];
                case 1:
                    parsed = _a.sent();
                    inventoryBuild = (0, inventory_js_1.buildInventory)(parsed.json);
                    inventory = inventoryBuild.inventory;
                    lint = inventoryBuild.lint;
                    return [4 /*yield*/, (0, index_js_1.ensureDir)(outputRoot)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, index_js_1.ensureDir)((0, node_path_1.join)(outputRoot, "index"))];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, (0, index_js_1.ensureDir)((0, node_path_1.join)(outputRoot, "drafts"))];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, (0, index_js_1.ensureDir)((0, node_path_1.join)(outputRoot, "state"))];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, (0, index_js_1.writeJsonFile)((0, node_path_1.join)(outputRoot, "state", "lint.json"), lint)];
                case 6:
                    _a.sent();
                    if (lint.status === "fail") {
                        keys = lint.suspicious_public_integration_keys.map(function (issue) { return issue.key; }).sort();
                        throw new Error("Ingest lint failed: ".concat(keys.length, " suspicious public integration key(s) matched denylist:\n").concat(keys
                            .map(function (key) { return "- ".concat(key); })
                            .join("\n")));
                    }
                    refs = (0, refs_js_1.buildRefs)(parsed.json, inventory);
                    resolver = (0, resolver_js_1.buildResolver)(parsed.json, inventory);
                    slices = (0, slicer_js_1.buildSlices)(parsed.json, inventory);
                    deterministic = (0, deterministic_js_1.buildDeterministicCover)(inventory);
                    validationErrors = collectErrors((0, validate_js_1.validateIndexSubset)(parsed.json, inventory), (0, validate_js_1.validateRefs)(inventory, refs), (0, validate_js_1.validateOAuthRefs)(parsed.json, refs), (0, validate_js_1.validateDeterministicSetEquality)(inventory, deterministic.covered_ids));
                    if (validationErrors.length > 0) {
                        throw new Error("Ingest validation failed:\n".concat(validationErrors.join("\n")));
                    }
                    return [4 /*yield*/, (0, index_js_1.writeJsonFile)((0, node_path_1.join)(outputRoot, "index", "inventory.json"), inventory)];
                case 7:
                    _a.sent();
                    return [4 /*yield*/, (0, index_js_1.writeJsonFile)((0, node_path_1.join)(outputRoot, "index", "refs.json"), refs)];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, (0, index_js_1.writeJsonFile)((0, node_path_1.join)(outputRoot, "index", "resolver.json"), resolver)];
                case 9:
                    _a.sent();
                    return [4 /*yield*/, writeSlices(outputRoot, slices)];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, (0, index_js_1.writeJsonFile)((0, node_path_1.join)(outputRoot, "drafts", "_deterministic.json"), deterministic)];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, (0, index_js_1.writeJsonFile)((0, node_path_1.join)(outputRoot, "state", "source.sha256"), {
                            source_path: parsed.sourcePath,
                            sha256: parsed.sourceSha256,
                        })];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, (0, index_js_1.writeJsonFile)((0, node_path_1.join)(outputRoot, "state", "header_budget.json"), exports.DEFAULT_HEADER_BUDGET)];
                case 13:
                    _a.sent();
                    return [2 /*return*/, {
                            inventory: inventory,
                            refs: refs,
                            resolver: resolver,
                            slices: slices,
                            deterministic: deterministic,
                            source_sha256: parsed.sourceSha256,
                            header_budget: exports.DEFAULT_HEADER_BUDGET,
                            lint: lint,
                        }];
            }
        });
    });
}
