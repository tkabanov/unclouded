import process from "node:process";

import { PHASE6_EMITTER_ORDER } from "../../m2/emitters/order.js";
import type { CommandContext } from "../registry.js";

export async function runPhase6ListEmittersCommand(context: CommandContext): Promise<void> {
  const json = context.args.includes("--json");
  if (json) {
    process.stdout.write(`${JSON.stringify(PHASE6_EMITTER_ORDER, null, 2)}\n`);
    return;
  }
  for (const emitter of PHASE6_EMITTER_ORDER) {
    process.stdout.write(`${emitter}\n`);
  }
}
