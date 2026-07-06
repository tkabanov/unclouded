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
exports.runPhase6MaterializeCommand = runPhase6MaterializeCommand;
var promises_1 = require("node:fs/promises");
var node_path_1 = require("node:path");
var node_process_1 = require("node:process");
var index_js_1 = require("../../m2/emitters/index.js");
var index_js_2 = require("../../m2/views/index.js");
var index_js_3 = require("../../utils/index.js");
var phase6_common_js_1 = require("./phase6-common.js");
function parseArgs(args) {
    var _a, _b;
    var outIndex = args.findIndex(function (arg) { return arg === "--out"; });
    var outDir = outIndex >= 0 && args[outIndex + 1] !== undefined && !((_a = args[outIndex + 1]) === null || _a === void 0 ? void 0 : _a.startsWith("-"))
        ? (_b = args[outIndex + 1]) !== null && _b !== void 0 ? _b : null
        : null;
    var appId = null;
    var consumed = new Set(outDir === null ? [] : [outIndex, outIndex + 1]);
    for (var index = 0; index < args.length; index += 1) {
        if (args[index] !== "--app-id") {
            continue;
        }
        var value = args[index + 1];
        if (!value || value.startsWith("-")) {
            throw new Error("Usage: b2c phase6:materialize <path-or-app> [--app-id <id>] [--out <dir>] [--dry-run] [--json] [--strict]");
        }
        appId = value;
        consumed.add(index);
        consumed.add(index + 1);
        index += 1;
    }
    var positional = args.find(function (arg, index) { return !arg.startsWith("-") && !consumed.has(index); });
    if (appId && positional) {
        throw new Error("Conflicting selectors: choose either positional <path-or-app> or --app-id.");
    }
    var target = appId ? "apps/".concat(appId) : positional;
    if (!target) {
        throw new Error("Usage: b2c phase6:materialize <path-or-app> [--app-id <id>] [--out <dir>] [--dry-run] [--json] [--strict]");
    }
    return {
        target: target,
        outDir: outDir,
        dryRun: args.includes("--dry-run"),
        json: args.includes("--json"),
        strictChecks: args.includes("--strict"),
    };
}
function runPhase6MaterializeCommand(context) {
    return __awaiter(this, void 0, void 0, function () {
        var parsed, targetDir, _a, inventory, refs, views, emitted, defaultPhase6Dir, outDir, writeAgentAlias, failedChecks, details, _i, _b, artifact, destination, aliasDestination, result, aliasNote;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    parsed = parseArgs(context.args);
                    return [4 /*yield*/, (0, phase6_common_js_1.resolvePhase6TargetDir)(context.workspaceRoot, parsed.target)];
                case 1:
                    targetDir = _c.sent();
                    return [4 /*yield*/, Promise.all([(0, phase6_common_js_1.loadInventoryFromTarget)(targetDir), (0, phase6_common_js_1.loadRefsFromTarget)(targetDir)])];
                case 2:
                    _a = _c.sent(), inventory = _a[0], refs = _a[1];
                    views = (0, index_js_2.buildM2Views)(inventory);
                    emitted = (0, index_js_1.emitAllPhase6Scaffolds)(inventory, views, refs);
                    defaultPhase6Dir = (0, node_path_1.join)(targetDir, "phase6");
                    outDir = parsed.outDir ? (0, node_path_1.resolve)(parsed.outDir) : defaultPhase6Dir;
                    writeAgentAlias = outDir === defaultPhase6Dir;
                    if (parsed.strictChecks) {
                        failedChecks = emitted.checks.filter(function (check) { return !check.pass; });
                        if (failedChecks.length > 0) {
                            details = failedChecks.map(function (check) { return "".concat(check.name, ": ").concat(check.detail); }).join("\n");
                            throw new Error("phase6:materialize strict checks failed:\n".concat(details));
                        }
                    }
                    if (!!parsed.dryRun) return [3 /*break*/, 9];
                    _i = 0, _b = emitted.artifacts;
                    _c.label = 3;
                case 3:
                    if (!(_i < _b.length)) return [3 /*break*/, 9];
                    artifact = _b[_i];
                    destination = (0, node_path_1.join)(outDir, artifact.path);
                    return [4 /*yield*/, (0, index_js_3.ensureDir)((0, node_path_1.dirname)(destination))];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, promises_1.writeFile)(destination, artifact.content, "utf8")];
                case 5:
                    _c.sent();
                    if (!(writeAgentAlias && artifact.path.startsWith("agent/"))) return [3 /*break*/, 8];
                    aliasDestination = (0, node_path_1.join)(targetDir, artifact.path);
                    return [4 /*yield*/, (0, index_js_3.ensureDir)((0, node_path_1.dirname)(aliasDestination))];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, (0, promises_1.writeFile)(aliasDestination, artifact.content, "utf8")];
                case 7:
                    _c.sent();
                    _c.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 3];
                case 9:
                    result = {
                        ok: emitted.checks.every(function (check) { return check.pass; }),
                        command: "phase6:materialize",
                        target: targetDir,
                        out_dir: outDir,
                        dry_run: parsed.dryRun,
                        strict: parsed.strictChecks,
                        agent_alias_written: writeAgentAlias && !parsed.dryRun,
                        artifact_count: emitted.artifacts.length,
                        checks: emitted.checks,
                        files: emitted.artifacts.map(function (artifact) { return artifact.path; }),
                    };
                    if (parsed.json) {
                        node_process_1.default.stdout.write("".concat(JSON.stringify(result, null, 2), "\n"));
                        return [2 /*return*/];
                    }
                    aliasNote = writeAgentAlias && !parsed.dryRun
                        ? " (and mirrored agent artifacts to ".concat((0, node_path_1.join)(targetDir, "agent"), ")")
                        : "";
                    node_process_1.default.stdout.write("phase6:materialize ".concat(parsed.dryRun ? "planned" : "wrote", " ").concat(emitted.artifacts.length, " artifact(s) to ").concat(outDir).concat(aliasNote, ".\n"));
                    return [2 /*return*/];
            }
        });
    });
}
