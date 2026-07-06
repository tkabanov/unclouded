import { join } from "node:path";
import process from "node:process";

import { runM1Acceptance } from "../../acceptance/m1.js";
import type { CommandContext } from "../registry.js";

export async function runAcceptM1Command(context: CommandContext): Promise<void> {
  await runM1Acceptance(context.workspaceRoot, join(context.workspaceRoot, "output"));
  process.stdout.write("M1 acceptance passed.\n");
}
