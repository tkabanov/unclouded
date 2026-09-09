#!/usr/bin/env node
/**
 * stop.mjs — Claude Code `Stop` hook entry for cursor-impl-cycle.
 *
 * Adapter: the cycle engine (`cursor-impl-cycle/hooks/stop.mjs`) was written for Cursor's stop-hook
 * contract (`{status, loop_count}` in, `{followup_message}` out). Claude Code's Stop hook instead
 * receives `{session_id, transcript_path, stop_hook_active, hook_event_name}` and continues the turn
 * when stdout is `{"decision":"block","reason":"…"}`. This wrapper translates both directions.
 *
 * FAIL-OPEN: any error lets the turn end normally (prints `{}`), it never wedges the session.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../.."); // <repo>
const logPath = path.join(__dirname, "stop.log");
const engineUrl = pathToFileURL(
  path.join(projectRoot, "cursor-impl-cycle", "hooks", "stop.mjs"),
).href;

function readStdin() {
  try {
    let raw = fs.readFileSync(0, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // strip UTF-8 BOM
    return raw;
  } catch {
    return "";
  }
}

const raw = readStdin();
const started = Date.now();
let claudeInput = {};
try {
  claudeInput = raw.trim() ? JSON.parse(raw) : {};
} catch {
  claudeInput = {};
}

// Guard against a runaway loop: Claude sets stop_hook_active when the turn was already continued by a
// stop hook. The engine has its own iteration caps, this is just a second belt.
const MAX_CHAIN = Number(process.env.IMPL_CYCLE_MAX_CHAIN || 50);
let chain = 0;
const chainPath = path.join(__dirname, ".stop-chain.json");
try {
  if (claudeInput.stop_hook_active) {
    const prev = JSON.parse(fs.readFileSync(chainPath, "utf8"));
    if (prev.session_id === claudeInput.session_id) chain = Number(prev.chain) || 0;
  }
} catch {
  chain = 0;
}

function finish(payloadOut, meta) {
  const elapsed = Date.now() - started;
  try {
    fs.appendFileSync(
      logPath,
      `${[
        `\n=== ${new Date().toISOString()} elapsed=${elapsed}ms ${meta} ===`,
        `stdin: ${raw.trim().slice(0, 1200)}`,
        `stdout: ${JSON.stringify(payloadOut).slice(0, 800)}`,
      ].join("\n")}\n`,
    );
  } catch {
    /* logging is best-effort */
  }
  process.stdout.write(`${JSON.stringify(payloadOut)}\n`);
  process.exit(0);
}

try {
  if (chain >= MAX_CHAIN) {
    finish({}, `action=chain-cap chain=${chain}`);
  }

  const { runStopHook } = await import(engineUrl);

  // Claude's Stop fires when the assistant finished its turn → that is Cursor's status "completed".
  const result = await runStopHook({ status: "completed", loop_count: chain });
  const followup = result?.payload?.followup_message;

  if (typeof followup === "string" && followup.trim()) {
    try {
      fs.writeFileSync(
        chainPath,
        JSON.stringify({ session_id: claudeInput.session_id ?? null, chain: chain + 1 }),
      );
    } catch {
      /* best-effort */
    }
    finish(
      { decision: "block", reason: followup },
      `action=${result.action ?? "?"} followup=true chain=${chain}`,
    );
  }

  try {
    fs.rmSync(chainPath, { force: true });
  } catch {
    /* best-effort */
  }
  finish({}, `action=${result?.action ?? "noop"} followup=false`);
} catch (err) {
  finish({}, `action=error error=${String(err?.message || err).split("\n")[0]}`);
}
