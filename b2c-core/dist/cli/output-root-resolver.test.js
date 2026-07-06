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
var promises_1 = require("node:fs/promises");
var node_path_1 = require("node:path");
var node_os_1 = require("node:os");
var node_test_1 = require("node:test");
var strict_1 = require("node:assert/strict");
var output_root_resolver_js_1 = require("./output-root-resolver.js");
function withTempWorkspace(run) {
    return __awaiter(this, void 0, void 0, function () {
        var workspaceRoot;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "b2c-output-root-"))];
                case 1:
                    workspaceRoot = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 4, 6]);
                    return [4 /*yield*/, run(workspaceRoot)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, (0, promises_1.rm)(workspaceRoot, { recursive: true, force: true })];
                case 5:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    });
}
(0, node_test_1.default)("resolver precedence: explicit root wins over defaults", function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, withTempWorkspace(function (workspaceRoot) { return __awaiter(void 0, void 0, void 0, function () {
                    var resolution;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, (0, output_root_resolver_js_1.resolveOutputRoot)(workspaceRoot, ["--output-root", "./custom-out"])];
                            case 1:
                                resolution = _a.sent();
                                strict_1.default.equal(resolution.resolutionSource, "explicit");
                                strict_1.default.equal(resolution.outputRoot, (0, node_path_1.join)(workspaceRoot, "custom-out"));
                                strict_1.default.deepEqual(resolution.args, []);
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, node_test_1.default)("resolver precedence: app selector uses app-scoped root", function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, withTempWorkspace(function (workspaceRoot) { return __awaiter(void 0, void 0, void 0, function () {
                    var resolution;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, (0, output_root_resolver_js_1.resolveOutputRoot)(workspaceRoot, ["--app-id", "teamapp-75292"])];
                            case 1:
                                resolution = _a.sent();
                                strict_1.default.equal(resolution.resolutionSource, "app");
                                strict_1.default.equal(resolution.outputRoot, (0, node_path_1.join)(workspaceRoot, "output", "teamapp-75292"));
                                strict_1.default.deepEqual(resolution.args, []);
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, node_test_1.default)("resolver requires explicit selector and rejects implicit legacy default", function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, withTempWorkspace(function (workspaceRoot) { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, strict_1.default.rejects((0, output_root_resolver_js_1.resolveOutputRoot)(workspaceRoot, ["--json"]), /Output root selector is required/)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, node_test_1.default)("resolver rejects conflicting selector combinations", function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, withTempWorkspace(function (workspaceRoot) { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, strict_1.default.rejects((0, output_root_resolver_js_1.resolveOutputRoot)(workspaceRoot, ["--app-id", "smartqms-33414", "--output-root", "/tmp/x"]), /Conflicting selectors/)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, strict_1.default.rejects((0, output_root_resolver_js_1.resolveOutputRoot)(workspaceRoot, ["--legacy-root", "--app-id", "smartqms-33414"]), /Conflicting selectors/)];
                            case 2:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, node_test_1.default)("resolution.json emission is deterministic", function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, withTempWorkspace(function (workspaceRoot) { return __awaiter(void 0, void 0, void 0, function () {
                    var args, first, firstJsonPath, firstJson, second, secondJsonPath, secondJson;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                args = ["--app-id", "barrow-no-temp"];
                                return [4 /*yield*/, (0, output_root_resolver_js_1.resolveOutputRoot)(workspaceRoot, args)];
                            case 1:
                                first = _a.sent();
                                firstJsonPath = (0, node_path_1.join)(first.outputRoot, "state", "resolution.json");
                                return [4 /*yield*/, (0, promises_1.readFile)(firstJsonPath, "utf8")];
                            case 2:
                                firstJson = _a.sent();
                                return [4 /*yield*/, (0, output_root_resolver_js_1.resolveOutputRoot)(workspaceRoot, args)];
                            case 3:
                                second = _a.sent();
                                secondJsonPath = (0, node_path_1.join)(second.outputRoot, "state", "resolution.json");
                                return [4 /*yield*/, (0, promises_1.readFile)(secondJsonPath, "utf8")];
                            case 4:
                                secondJson = _a.sent();
                                strict_1.default.equal(firstJson, secondJson);
                                return [2 /*return*/];
                        }
                    });
                }); })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
