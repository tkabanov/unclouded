import type { EmittedArtifact } from "./gherkin.js";
import type { M2ViewBundle } from "../contracts/view-ir.js";
import type { InventoryEntry } from "../../types.js";

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toYamlValue(value: string | null): string {
  if (value === null) {
    return "null";
  }
  return JSON.stringify(value);
}

function sanitizeIdentifier(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "_");
}

function pascalCase(value: string): string {
  const cleaned = value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .map((part) => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join("");
  return cleaned.length > 0 ? cleaned : "UdsType";
}

function mapPrismaScalar(fieldType: string | null): string {
  switch ((fieldType ?? "").toLowerCase()) {
    case "number":
    case "float":
    case "decimal":
      return "Float?";
    case "boolean":
      return "Boolean?";
    case "date":
    case "datetime":
      return "DateTime?";
    default:
      return "String?";
  }
}

export function emitUdsScaffold(
  views: M2ViewBundle,
  byId: ReadonlyMap<string, InventoryEntry>,
  userTypeFields: InventoryEntry[],
): EmittedArtifact[] {
  const schema = views.uds_types
    .map((udsType) => {
      const fields = userTypeFields
        .filter((entry) => entry.parent_id === udsType.user_type_ref)
        .map((entry) => ({
          id: entry.id,
          pointer: entry.pointer,
          source_entity_class: entry.entity_class,
          field_id: asString(entry.meta?.field_id) ?? entry.id,
          type: asString(entry.meta?.type),
          currency_code: asString(entry.meta?.currency_code),
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
      const source = byId.get(udsType.user_type_ref);
      const display =
        typeof source?.meta?.display === "string" && source.meta.display.length > 0
          ? source.meta.display
          : udsType.user_type_ref;
      return {
        id: udsType.id,
        user_type_ref: udsType.user_type_ref,
        source_pointer: source?.pointer ?? null,
        source_entity_class: source?.entity_class ?? null,
        display,
        fields,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const yamlLines = ["version: 1", "types:"];
  for (const item of schema) {
    yamlLines.push(`  - id: ${JSON.stringify(item.id)}`);
    yamlLines.push(`    user_type_ref: ${JSON.stringify(item.user_type_ref)}`);
    yamlLines.push(`    source_pointer: ${toYamlValue(item.source_pointer)}`);
    yamlLines.push(`    source_entity_class: ${toYamlValue(item.source_entity_class)}`);
    yamlLines.push(`    display: ${JSON.stringify(item.display)}`);
    yamlLines.push("    fields:");
    for (const field of item.fields) {
      yamlLines.push(`      - id: ${JSON.stringify(field.id)}`);
      yamlLines.push(`        pointer: ${JSON.stringify(field.pointer)}`);
      yamlLines.push(`        source_entity_class: ${JSON.stringify(field.source_entity_class)}`);
      yamlLines.push(`        field_id: ${JSON.stringify(field.field_id)}`);
      yamlLines.push(`        type: ${toYamlValue(field.type)}`);
      yamlLines.push(`        currency_code: ${toYamlValue(field.currency_code)}`);
    }
  }

  const prismaLines = [
    "// generated scaffold: deterministic baseline",
    'generator client { provider = "prisma-client-js" }',
    'datasource db { provider = "postgresql" url = env("DATABASE_URL") }',
    "",
  ];
  for (const item of schema) {
    prismaLines.push(`model ${pascalCase(item.id)} {`);
    prismaLines.push("  id String @id @default(cuid())");
    for (const field of item.fields) {
      prismaLines.push(`  ${sanitizeIdentifier(field.field_id)} ${mapPrismaScalar(field.type)}`);
    }
    prismaLines.push(`  // source_user_type_ref ${JSON.stringify(item.user_type_ref)}`);
    prismaLines.push("}");
    prismaLines.push("");
  }

  const ddlLines = ["-- generated scaffold: deterministic baseline"];
  for (const item of schema) {
    const tableName = sanitizeIdentifier(item.id).toLowerCase();
    ddlLines.push(`CREATE TABLE IF NOT EXISTS "${tableName}" (`);
    ddlLines.push('  "id" text PRIMARY KEY');
    for (const field of item.fields) {
      ddlLines.push(`, "${sanitizeIdentifier(field.field_id).toLowerCase()}" text`);
    }
    ddlLines.push(");");
    ddlLines.push("");
  }

  const graphqlLines = ["# generated scaffold: deterministic baseline"];
  for (const item of schema) {
    graphqlLines.push(`type ${pascalCase(item.id)} {`);
    graphqlLines.push("  id: ID!");
    for (const field of item.fields) {
      graphqlLines.push(`  ${sanitizeIdentifier(field.field_id)}: String`);
    }
    graphqlLines.push("}");
    graphqlLines.push("");
  }

  const typesLines = ["// generated scaffold: deterministic baseline"];
  for (const item of schema) {
    typesLines.push(`export interface ${pascalCase(item.id)} {`);
    typesLines.push("  id: string;");
    for (const field of item.fields) {
      typesLines.push(`  ${sanitizeIdentifier(field.field_id)}: string | null;`);
    }
    typesLines.push("}");
    typesLines.push("");
  }

  const rlsLines = ["-- generated scaffold: deterministic baseline"];
  for (const item of schema) {
    const tableName = sanitizeIdentifier(item.id).toLowerCase();
    rlsLines.push(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);
    rlsLines.push(`-- TODO(marker): create policy for ${item.user_type_ref}`);
  }
  rlsLines.push("");

  const migrationLines = [
    "-- generated scaffold: deterministic baseline",
    "-- TODO(marker): convert scaffold DDL + RLS into real migration steps",
    "-- This file is intentionally deterministic for Wave C acceptance.",
    "",
  ];

  return [
    {
      path: "agent/schema/uds.json",
      content: stableJson({
        version: 1,
        generated_from: "inventory+views",
        type_count: schema.length,
        types: schema,
      }),
    },
    {
      path: "agent/schema/uds.yaml",
      content: `${yamlLines.join("\n")}\n`,
    },
    {
      path: "agent/schema/uds.prisma",
      content: `${prismaLines.join("\n")}\n`,
    },
    {
      path: "agent/schema/uds.ddl.sql",
      content: `${ddlLines.join("\n")}\n`,
    },
    {
      path: "agent/schema/uds.graphql",
      content: `${graphqlLines.join("\n")}\n`,
    },
    {
      path: "agent/schema/uds.types.ts",
      content: `${typesLines.join("\n")}\n`,
    },
    {
      path: "agent/schema/rls.sql",
      content: `${rlsLines.join("\n")}\n`,
    },
    {
      path: "agent/schema/migrations/0001_uds_scaffold.sql",
      content: `${migrationLines.join("\n")}\n`,
    },
  ];
}
