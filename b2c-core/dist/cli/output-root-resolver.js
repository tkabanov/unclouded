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
exports.resolveOutputRoot = resolveOutputRoot;
var node_path_1 = require("node:path");
var index_js_1 = require("../utils/index.js");
var RESOLUTION_SCHEMA_VERSION = "b2c.output-root-resolution.v1";
function parseRootSelectors(args) {
    var appId = null;
    var explicitRoot = null;
    var legacyRoot = false;
    var remainingArgs = [];
    for (var index = 0; index < args.length; index += 1) {
        var arg = args[index];
        if (!arg) {
            continue;
        }
        if (arg === "--app-id") {
            var next = args[index + 1];
            if (!next || next.startsWith("-")) {
                throw new Error("Missing value for --app-id. Usage: --app-id <id>");
            }
            if (appId !== null) {
                throw new Error("Duplicate --app-id selector.");
            }
            appId = next;
            index += 1;
            continue;
        }
        if (arg === "--output-root") {
            var next = args[index + 1];
            if (!next || next.startsWith("-")) {
                throw new Error("Missing value for --output-root. Usage: --output-root <path>");
            }
            if (explicitRoot !== null) {
                throw new Error("Duplicate --output-root selector.");
            }
            explicitRoot = next;
            index += 1;
            continue;
        }
        if (arg === "--legacy-root") {
            if (legacyRoot) {
                throw new Error("Duplicate --legacy-root selector.");
            }
            legacyRoot = true;
            continue;
        }
        remainingArgs.push(arg);
    }
    if (appId && explicitRoot) {
        throw new Error("Conflicting selectors: --app-id cannot be combined with --output-root.");
    }
    if (legacyRoot && (appId || explicitRoot)) {
        throw new Error("Conflicting selectors: --legacy-root cannot be combined with --app-id or --output-root.");
    }
    if (appId && !/^[A-Za-z0-9._-]+$/.test(appId)) {
        throw new Error("Invalid --app-id \"".concat(appId, "\". Allowed pattern: [A-Za-z0-9._-]+"));
    }
    return {
        appId: appId,
        explicitRoot: explicitRoot,
        legacyRoot: legacyRoot,
        remainingArgs: remainingArgs,
    };
}
function resolveOutputRoot(workspaceRoot, args) {
    return __awaiter(this, void 0, void 0, function () {
        var selectors, explicitRootAbsolute, outputRoot, resolutionSource;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    selectors = parseRootSelectors(args);
                    if (selectors.explicitRoot === null && selectors.appId === null && !selectors.legacyRoot) {
                        throw new Error("Output root selector is required. Use --app-id <id> for project-scoped artifacts, --output-root <path> for explicit root, or --legacy-root to force output/.");
                    }
                    explicitRootAbsolute = selectors.explicitRoot !== null ? (0, node_path_1.resolve)(workspaceRoot, selectors.explicitRoot) : null;
                    outputRoot = explicitRootAbsolute !== null
                        ? explicitRootAbsolute
                        : selectors.appId !== null
                            ? (0, node_path_1.join)(workspaceRoot, "output", selectors.appId)
                            : (0, node_path_1.join)(workspaceRoot, "output");
                    resolutionSource = selectors.explicitRoot !== null ? "explicit" : selectors.appId !== null ? "app" : "legacy";
                    return [4 /*yield*/, (0, index_js_1.writeJsonFile)((0, node_path_1.join)(outputRoot, "state", "resolution.json"), {
                            schema: RESOLUTION_SCHEMA_VERSION,
                            schema_version: 1,
                            workspace_root: workspaceRoot,
                            output_root: outputRoot,
                            resolution_source: resolutionSource,
                            selectors: {
                                app_id: selectors.appId,
                                explicit_root: explicitRootAbsolute,
                                legacy_root: selectors.legacyRoot,
                            },
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/, {
                            outputRoot: outputRoot,
                            resolutionSource: resolutionSource,
                            schemaVersion: RESOLUTION_SCHEMA_VERSION,
                            args: selectors.remainingArgs,
                        }];
            }
        });
    });
}
