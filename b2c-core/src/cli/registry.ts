import { runAcceptM1Command } from "./commands/accept-m1.js";
import { runAcceptM2Command } from "./commands/phase6-accept.js";
import { runIngestCommand } from "./commands/ingest.js";
import { runInvalidateCommand } from "./commands/invalidate.js";
import { runPhase6ListEmittersCommand } from "./commands/phase6-list-emitters.js";
import { runPhase6MaterializeCommand } from "./commands/phase6-materialize.js";

export interface CommandContext {
  workspaceRoot: string;
  args: string[];
}

export type CommandHandler = (context: CommandContext) => Promise<void>;

export function buildRegistry(): Map<string, CommandHandler> {
  return new Map<string, CommandHandler>([
    ["ingest", runIngestCommand],
    ["invalidate", runInvalidateCommand],
    ["phase6:materialize", runPhase6MaterializeCommand],
    ["accept:m1", runAcceptM1Command],
    ["accept:m2", runAcceptM2Command],
    ["phase6:list-emitters", runPhase6ListEmittersCommand],
  ]);
}
