# b2c-core — Bubble metadata extractor

Deterministic engine that converts Bubble.io metadata exports (`.bubble`) into typed intermediate representation (IR).

## Quick start

```bash
cd b2c-core
npm install
npm run build

npm run ingest -- smartqms-33414 --app-id smartqms-33414
npm run phase6:materialize -- --app-id smartqms-33414 --strict --json
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run ingest -- <app> --app-id <id>` | `.bubble` → typed index IR |
| `npm run phase6:materialize -- --app-id <id>` | index → manifest IR |
| `npm run accept:m1` | Ingest regression (sample apps) |
| `npm run test:unit` | Unit tests |

## Output layout

`output/<app-id>/`: `index/`, `agent/manifest.json`

## CLI

The `b2c` binary is available after build:

```bash
node dist/cli.js ingest --help
```
