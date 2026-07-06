import { z } from "zod";

import type { BubbleRoot } from "./types.js";
import { readTextFile } from "./utils/fs.js";
import { sha256Text } from "./utils/hash.js";

const BubbleRootSchema = z.object({
  _index: z
    .object({
      id_to_path: z.record(z.string()).optional(),
      custom_name_to_id: z.record(z.unknown()).optional(),
    })
    .optional(),
  pages: z.record(z.unknown()).optional(),
  user_types: z.record(z.unknown()).optional(),
  option_sets: z.record(z.unknown()).optional(),
  element_definitions: z.record(z.unknown()).optional(),
  mobile_views: z.record(z.unknown()).optional(),
  styles: z.record(z.unknown()).optional(),
  api: z.record(z.unknown()).optional(),
  settings: z
    .object({
      client_safe: z.record(z.unknown()).optional(),
      secure: z.record(z.unknown()).optional(),
    })
    .optional(),
});

export interface ParsedBubble {
  sourcePath: string;
  rawText: string;
  sourceSha256: string;
  json: BubbleRoot;
}

export async function parseBubbleFile(path: string): Promise<ParsedBubble> {
  const rawText = await readTextFile(path);
  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(rawText) as unknown;
  } catch (error) {
    throw new Error(`Input is not valid JSON: ${path}`, { cause: error });
  }

  const schemaResult = BubbleRootSchema.safeParse(parsedUnknown);
  if (!schemaResult.success) {
    throw new Error(
      `Bubble preconditions failed for ${path}: ${schemaResult.error.message}`,
    );
  }

  return {
    sourcePath: path,
    rawText,
    sourceSha256: sha256Text(rawText),
    json: parsedUnknown as BubbleRoot,
  };
}
