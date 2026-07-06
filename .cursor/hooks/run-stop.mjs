#!/usr/bin/env node
/**
 * Cursor stop hook entry — robust stdin parse, direct runStopHook call, file logging.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const logPath = path.join(__dirname, "stop.log");
const stopModuleUrl = pathToFileURL(
  path.join(projectRoot, "cursor-impl-cycle", "hooks", "stop.mjs"),
).href;

const raw = fs.readFileSync(0, "utf8");
const started = Date.now();

let hookInput = {};
let parseMode = "empty";
try {
  const { parseCursorHookInput, runStopHook } = await import(stopModuleUrl);
  hookInput = parseCursorHookInput(raw);
  parseMode = hookInput._parse_fallback ? "fallback" : raw.trim() ? "json" : "empty";
  delete hookInput._parse_fallback;

  const result = await runStopHook(hookInput);
  const payload = result.payload ?? {};
  const stdout = `${JSON.stringify(payload)}\n`;
  const elapsed = Date.now() - started;
  const hasFollowup = Boolean(payload.followup_message);

  fs.appendFileSync(
    logPath,
    [
      `\n=== ${new Date().toISOString()} elapsed=${elapsed}ms parse=${parseMode} status=${hookInput.status ?? "(none)"} action=${result.action ?? "?"} followup=${hasFollowup} ===`,
      `stdin: ${raw.trim().slice(0, 1200)}${raw.trim().length > 1200 ? "..." : ""}`,
      `stdout: ${stdout.trim().slice(0, 800)}${stdout.trim().length > 800 ? "..." : ""}`,
      `exit: 0`,
    ].join("\n") + "\n",
  );

  process.stdout.write(stdout);
} catch (err) {
  const elapsed = Date.now() - started;
  fs.appendFileSync(
    logPath,
    [
      `\n=== ${new Date().toISOString()} elapsed=${elapsed}ms parse=error followup=false ===`,
      `stdin: ${raw.trim().slice(0, 1200)}${raw.trim().length > 1200 ? "..." : ""}`,
      `error: ${err.message}`,
      err.stack ?? "",
      `exit: 1`,
    ].join("\n") + "\n",
  );
  process.stderr.write(`cursor-impl-cycle wrapper error: ${err.message}\n`);
  process.stdout.write("{}\n");
  process.exit(1);
}
