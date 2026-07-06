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
exports.runAcceptM2Command = runAcceptM2Command;
var node_process_1 = require("node:process");
var promises_1 = require("node:fs/promises");
var node_path_1 = require("node:path");
var phase6_js_1 = require("../../m2/acceptance/phase6.js");
var phase6_common_js_1 = require("./phase6-common.js");
function parseArgs(args) {
    var fromFlag = null;
    var appId = null;
    var consumed = new Set();
    for (var index = 0; index < args.length; index += 1) {
        var arg = args[index];
        if (arg === "--workspace" || arg === "--target") {
            var value = args[index + 1];
            if (!value || value.startsWith("-")) {
                throw new Error("Usage: b2c accept:m2 <path-or-app> [--target <path-or-app>] [--app-id <id>] [--json] [--fail-fast]");
            }
            fromFlag = value;
            consumed.add(index);
            consumed.add(index + 1);
            index += 1;
            continue;
        }
        if (arg === "--app-id") {
            var value = args[index + 1];
            if (!value || value.startsWith("-")) {
                throw new Error("Usage: b2c accept:m2 <path-or-app> [--target <path-or-app>] [--app-id <id>] [--json] [--fail-fast]");
            }
            appId = value;
            consumed.add(index);
            consumed.add(index + 1);
            index += 1;
        }
    }
    if (fromFlag && appId) {
        throw new Error("Conflicting selectors: choose either --target/--workspace or --app-id.");
    }
    var positional = args.find(function (arg, index) { return !arg.startsWith("-") && !consumed.has(index); });
    var target = appId ? "apps/".concat(appId) : (fromFlag !== null && fromFlag !== void 0 ? fromFlag : positional);
    if (!target) {
        throw new Error("Usage: b2c accept:m2 <path-or-app> [--target <path-or-app>] [--app-id <id>] [--json] [--fail-fast]");
    }
    return {
        target: target,
        json: args.includes("--json"),
        failFast: args.includes("--fail-fast"),
    };
}
function runAcceptM2Command(context) {
    return __awaiter(this, void 0, void 0, function () {
        var args, targetDir, lint, lintLoadError, _a, inventory, refs, error_1, acceptance, firstFailure, payload, failedChecks, diagnosticsPath, diagnosticsPayload, detail;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    args = parseArgs(context.args);
                    return [4 /*yield*/, (0, phase6_common_js_1.resolvePhase6TargetDir)(context.workspaceRoot, args.target)];
                case 1:
                    targetDir = _b.sent();
                    lint = null;
                    lintLoadError = null;
                    return [4 /*yield*/, Promise.all([(0, phase6_common_js_1.loadInventoryFromTarget)(targetDir), (0, phase6_common_js_1.loadRefsFromTarget)(targetDir)])];
                case 2:
                    _a = _b.sent(), inventory = _a[0], refs = _a[1];
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, (0, phase6_common_js_1.loadLintFromTarget)(targetDir)];
                case 4:
                    lint = _b.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _b.sent();
                    lintLoadError = error_1 instanceof Error ? error_1.message : String(error_1);
                    return [3 /*break*/, 6];
                case 6:
                    acceptance = (0, phase6_js_1.runM2Phase6AcceptanceScaffold)(inventory, refs, { lint: lint, lintLoadError: lintLoadError });
                    if (args.failFast) {
                        firstFailure = acceptance.checks.find(function (check) { return !check.pass; });
                        if (firstFailure) {
                            acceptance.checks = [firstFailure];
                            acceptance.ok = false;
                        }
                    }
                    payload = {
                        ok: acceptance.ok,
                        command: "accept:m2",
                        target: targetDir,
                        fail_fast: args.failFast,
                        checks: acceptance.checks,
                    };
                    failedChecks = acceptance.checks.filter(function (check) { return !check.pass; });
                    diagnosticsPath = (0, node_path_1.resolve)(targetDir, "state", "accept-m2-report.json");
                    diagnosticsPayload = {
                        ok: acceptance.ok,
                        check_count: acceptance.checks.length,
                        timestamp: new Date().toISOString(),
                        failed_checks: failedChecks.map(function (check) { return ({ name: check.name, detail: check.detail }); }),
                        failed_check_names: failedChecks.map(function (check) { return check.name; }),
                        checks: acceptance.checks,
                    };
                    return [4 /*yield*/, (0, promises_1.mkdir)((0, node_path_1.resolve)(targetDir, "state"), { recursive: true })];
                case 7:
                    _b.sent();
                    return [4 /*yield*/, (0, promises_1.writeFile)(diagnosticsPath, "".concat(JSON.stringify(diagnosticsPayload, null, 2), "\n"), "utf8")];
                case 8:
                    _b.sent();
                    if (args.json) {
                        node_process_1.default.stdout.write("".concat(JSON.stringify(payload, null, 2), "\n"));
                    }
                    if (!acceptance.ok) {
                        detail = failedChecks.map(function (check) { return "- ".concat(check.name, ": ").concat(check.detail); }).join("\n");
                        throw new Error("M2 acceptance failed:\n".concat(detail));
                    }
                    if (!args.json) {
                        node_process_1.default.stdout.write("M2 acceptance passed (".concat(acceptance.checks.length, " checks).\n"));
                    }
                    return [2 /*return*/];
            }
        });
    });
}
