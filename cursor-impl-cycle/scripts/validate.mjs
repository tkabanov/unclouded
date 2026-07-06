import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACK_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCHEMA_MAP = {
  "module-map": "module-map.schema.json",
  decompose: "decompose.schema.json",
  "coverage-report": "coverage-report.schema.json",
  review: "review.schema.json",
  triage: "triage.schema.json",
  cycle: "cycle.schema.json",
};

let ajvInstance = null;
const validators = new Map();

async function getValidator(schemaName) {
  if (validators.has(schemaName)) return validators.get(schemaName);
  const { default: Ajv } = await import("ajv");
  if (!ajvInstance) {
    ajvInstance = new Ajv({ allErrors: true, strict: false });
  }
  const schemaPath = path.join(PACK_ROOT, "schemas", schemaName);
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  delete schema.$schema;
  const validate = ajvInstance.compile(schema);
  validators.set(schemaName, validate);
  return validate;
}

export async function validateArtifact(kind, data) {
  const schemaFile = SCHEMA_MAP[kind];
  if (!schemaFile) {
    throw new Error(`Unknown artifact kind: ${kind}`);
  }
  const validate = await getValidator(schemaFile);
  const ok = validate(data);
  return {
    ok,
    errors: ok
      ? []
      : (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`),
  };
}

export async function validateArtifactFile(kind, filePath) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, errors: [`file not found: ${filePath}`] };
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    return { ok: false, errors: [`invalid JSON: ${err.message}`] };
  }
  return validateArtifact(kind, data);
}

async function main() {
  const [kind, filePath] = process.argv.slice(2);
  if (!kind || !filePath) {
    console.error("Usage: validate.mjs <kind> <file>");
    process.exit(1);
  }
  const result = await validateArtifactFile(kind, path.resolve(filePath));
  if (result.ok) {
    console.log(`OK ${kind}: ${filePath}`);
    process.exit(0);
  }
  console.error(`FAIL ${kind}: ${filePath}`);
  for (const err of result.errors) console.error(`  - ${err}`);
  process.exit(1);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
