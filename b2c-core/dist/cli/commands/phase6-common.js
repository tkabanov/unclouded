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
exports.resolvePhase6TargetDir = resolvePhase6TargetDir;
exports.loadInventoryFromTarget = loadInventoryFromTarget;
exports.loadRefsFromTarget = loadRefsFromTarget;
exports.loadLintFromTarget = loadLintFromTarget;
var node_path_1 = require("node:path");
var promises_1 = require("node:fs/promises");
var index_js_1 = require("../../utils/index.js");
function isDirectory(path) {
    return __awaiter(this, void 0, void 0, function () {
        var info, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, promises_1.stat)(path)];
                case 1:
                    info = _b.sent();
                    return [2 /*return*/, info.isDirectory()];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function hasInventory(path) {
    return __awaiter(this, void 0, void 0, function () {
        var inventoryPath, info, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    inventoryPath = (0, node_path_1.join)(path, "index", "inventory.json");
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, promises_1.stat)(inventoryPath)];
                case 2:
                    info = _b.sent();
                    return [2 /*return*/, info.isFile()];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function resolvePhase6TargetDir(workspaceRoot, target) {
    return __awaiter(this, void 0, void 0, function () {
        var direct, underWorkspaceB2c, underWorkspaceApps, candidates, matches, _i, candidates_1, candidate, _a, uniqueMatches;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    direct = (0, node_path_1.resolve)(target);
                    underWorkspaceB2c = (0, node_path_1.join)(workspaceRoot, "b2c", target);
                    underWorkspaceApps = (0, node_path_1.join)(workspaceRoot, "b2c", "apps", target);
                    candidates = [direct, underWorkspaceB2c, underWorkspaceApps];
                    matches = [];
                    _i = 0, candidates_1 = candidates;
                    _c.label = 1;
                case 1:
                    if (!(_i < candidates_1.length)) return [3 /*break*/, 6];
                    candidate = candidates_1[_i];
                    return [4 /*yield*/, isDirectory(candidate)];
                case 2:
                    _a = (_c.sent());
                    if (!_a) return [3 /*break*/, 4];
                    return [4 /*yield*/, hasInventory(candidate)];
                case 3:
                    _a = (_c.sent());
                    _c.label = 4;
                case 4:
                    if (_a) {
                        matches.push(candidate);
                    }
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    uniqueMatches = __spreadArray([], new Set(matches), true);
                    if (uniqueMatches.length === 1) {
                        return [2 /*return*/, (_b = uniqueMatches[0]) !== null && _b !== void 0 ? _b : direct];
                    }
                    if (uniqueMatches.length > 1) {
                        throw new Error("Ambiguous phase6 target \"".concat(target, "\". Matched multiple directories with index/inventory.json: ").concat(uniqueMatches.join(", "), ". Use an explicit path to disambiguate."));
                    }
                    throw new Error("Could not resolve phase6 target \"".concat(target, "\". Expected directory with index/inventory.json (direct path, under ").concat((0, node_path_1.join)(workspaceRoot, "b2c"), ", or under ").concat((0, node_path_1.join)(workspaceRoot, "b2c", "apps"), ")."));
            }
        });
    });
}
function loadInventoryFromTarget(targetDir) {
    return __awaiter(this, void 0, void 0, function () {
        var inventoryPath, text;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    inventoryPath = (0, node_path_1.join)(targetDir, "index", "inventory.json");
                    return [4 /*yield*/, (0, index_js_1.readTextFile)(inventoryPath)];
                case 1:
                    text = _a.sent();
                    return [2 /*return*/, JSON.parse(text)];
            }
        });
    });
}
function loadRefsFromTarget(targetDir) {
    return __awaiter(this, void 0, void 0, function () {
        var refsPath, text, parsed;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    refsPath = (0, node_path_1.join)(targetDir, "index", "refs.json");
                    return [4 /*yield*/, (0, index_js_1.readTextFile)(refsPath)];
                case 1:
                    text = _a.sent();
                    parsed = JSON.parse(text);
                    if (!Array.isArray(parsed)) {
                        throw new Error("Invalid refs.json format at ".concat(refsPath, ": expected array"));
                    }
                    return [2 /*return*/, parsed];
            }
        });
    });
}
function loadLintFromTarget(targetDir) {
    return __awaiter(this, void 0, void 0, function () {
        var lintPath, text, parsed, lint;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    lintPath = (0, node_path_1.join)(targetDir, "state", "lint.json");
                    return [4 /*yield*/, (0, index_js_1.readTextFile)(lintPath)];
                case 1:
                    text = _a.sent();
                    parsed = JSON.parse(text);
                    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                        throw new Error("Invalid lint.json format at ".concat(lintPath, ": expected object"));
                    }
                    lint = parsed;
                    if (lint.status !== "pass" && lint.status !== "fail") {
                        throw new Error("Invalid lint.json format at ".concat(lintPath, ": expected status=pass|fail"));
                    }
                    if (!Array.isArray(lint.suspicious_public_integration_keys)) {
                        throw new Error("Invalid lint.json format at ".concat(lintPath, ": expected suspicious_public_integration_keys array"));
                    }
                    return [2 /*return*/, lint];
            }
        });
    });
}
