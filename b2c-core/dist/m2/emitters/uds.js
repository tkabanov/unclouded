"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitUdsScaffold = emitUdsScaffold;
function stableJson(value) {
    return "".concat(JSON.stringify(value, null, 2), "\n");
}
function asString(value) {
    return typeof value === "string" ? value : null;
}
function toYamlValue(value) {
    if (value === null) {
        return "null";
    }
    return JSON.stringify(value);
}
function sanitizeIdentifier(value) {
    return value.replace(/[^a-zA-Z0-9_]/g, "_");
}
function pascalCase(value) {
    var cleaned = value
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(function (part) { return part.length > 0; })
        .map(function (part) { return part[0].toUpperCase() + part.slice(1).toLowerCase(); })
        .join("");
    return cleaned.length > 0 ? cleaned : "UdsType";
}
function mapPrismaScalar(fieldType) {
    switch ((fieldType !== null && fieldType !== void 0 ? fieldType : "").toLowerCase()) {
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
function emitUdsScaffold(views, byId, userTypeFields) {
    var schema = views.uds_types
        .map(function (udsType) {
        var _a, _b, _c;
        var fields = userTypeFields
            .filter(function (entry) { return entry.parent_id === udsType.user_type_ref; })
            .map(function (entry) {
            var _a, _b, _c, _d;
            return ({
                id: entry.id,
                pointer: entry.pointer,
                source_entity_class: entry.entity_class,
                field_id: (_b = asString((_a = entry.meta) === null || _a === void 0 ? void 0 : _a.field_id)) !== null && _b !== void 0 ? _b : entry.id,
                type: asString((_c = entry.meta) === null || _c === void 0 ? void 0 : _c.type),
                currency_code: asString((_d = entry.meta) === null || _d === void 0 ? void 0 : _d.currency_code),
            });
        })
            .sort(function (a, b) { return a.id.localeCompare(b.id); });
        var source = byId.get(udsType.user_type_ref);
        var display = typeof ((_a = source === null || source === void 0 ? void 0 : source.meta) === null || _a === void 0 ? void 0 : _a.display) === "string" && source.meta.display.length > 0
            ? source.meta.display
            : udsType.user_type_ref;
        return {
            id: udsType.id,
            user_type_ref: udsType.user_type_ref,
            source_pointer: (_b = source === null || source === void 0 ? void 0 : source.pointer) !== null && _b !== void 0 ? _b : null,
            source_entity_class: (_c = source === null || source === void 0 ? void 0 : source.entity_class) !== null && _c !== void 0 ? _c : null,
            display: display,
            fields: fields,
        };
    })
        .sort(function (a, b) { return a.id.localeCompare(b.id); });
    var yamlLines = ["version: 1", "types:"];
    for (var _i = 0, schema_1 = schema; _i < schema_1.length; _i++) {
        var item = schema_1[_i];
        yamlLines.push("  - id: ".concat(JSON.stringify(item.id)));
        yamlLines.push("    user_type_ref: ".concat(JSON.stringify(item.user_type_ref)));
        yamlLines.push("    source_pointer: ".concat(toYamlValue(item.source_pointer)));
        yamlLines.push("    source_entity_class: ".concat(toYamlValue(item.source_entity_class)));
        yamlLines.push("    display: ".concat(JSON.stringify(item.display)));
        yamlLines.push("    fields:");
        for (var _a = 0, _b = item.fields; _a < _b.length; _a++) {
            var field = _b[_a];
            yamlLines.push("      - id: ".concat(JSON.stringify(field.id)));
            yamlLines.push("        pointer: ".concat(JSON.stringify(field.pointer)));
            yamlLines.push("        source_entity_class: ".concat(JSON.stringify(field.source_entity_class)));
            yamlLines.push("        field_id: ".concat(JSON.stringify(field.field_id)));
            yamlLines.push("        type: ".concat(toYamlValue(field.type)));
            yamlLines.push("        currency_code: ".concat(toYamlValue(field.currency_code)));
        }
    }
    var prismaLines = [
        "// generated scaffold: deterministic baseline",
        'generator client { provider = "prisma-client-js" }',
        'datasource db { provider = "postgresql" url = env("DATABASE_URL") }',
        "",
    ];
    for (var _c = 0, schema_2 = schema; _c < schema_2.length; _c++) {
        var item = schema_2[_c];
        prismaLines.push("model ".concat(pascalCase(item.id), " {"));
        prismaLines.push("  id String @id @default(cuid())");
        for (var _d = 0, _e = item.fields; _d < _e.length; _d++) {
            var field = _e[_d];
            prismaLines.push("  ".concat(sanitizeIdentifier(field.field_id), " ").concat(mapPrismaScalar(field.type)));
        }
        prismaLines.push("  // source_user_type_ref ".concat(JSON.stringify(item.user_type_ref)));
        prismaLines.push("}");
        prismaLines.push("");
    }
    var ddlLines = ["-- generated scaffold: deterministic baseline"];
    for (var _f = 0, schema_3 = schema; _f < schema_3.length; _f++) {
        var item = schema_3[_f];
        var tableName = sanitizeIdentifier(item.id).toLowerCase();
        ddlLines.push("CREATE TABLE IF NOT EXISTS \"".concat(tableName, "\" ("));
        ddlLines.push('  "id" text PRIMARY KEY');
        for (var _g = 0, _h = item.fields; _g < _h.length; _g++) {
            var field = _h[_g];
            ddlLines.push(", \"".concat(sanitizeIdentifier(field.field_id).toLowerCase(), "\" text"));
        }
        ddlLines.push(");");
        ddlLines.push("");
    }
    var graphqlLines = ["# generated scaffold: deterministic baseline"];
    for (var _j = 0, schema_4 = schema; _j < schema_4.length; _j++) {
        var item = schema_4[_j];
        graphqlLines.push("type ".concat(pascalCase(item.id), " {"));
        graphqlLines.push("  id: ID!");
        for (var _k = 0, _l = item.fields; _k < _l.length; _k++) {
            var field = _l[_k];
            graphqlLines.push("  ".concat(sanitizeIdentifier(field.field_id), ": String"));
        }
        graphqlLines.push("}");
        graphqlLines.push("");
    }
    var typesLines = ["// generated scaffold: deterministic baseline"];
    for (var _m = 0, schema_5 = schema; _m < schema_5.length; _m++) {
        var item = schema_5[_m];
        typesLines.push("export interface ".concat(pascalCase(item.id), " {"));
        typesLines.push("  id: string;");
        for (var _o = 0, _p = item.fields; _o < _p.length; _o++) {
            var field = _p[_o];
            typesLines.push("  ".concat(sanitizeIdentifier(field.field_id), ": string | null;"));
        }
        typesLines.push("}");
        typesLines.push("");
    }
    var rlsLines = ["-- generated scaffold: deterministic baseline"];
    for (var _q = 0, schema_6 = schema; _q < schema_6.length; _q++) {
        var item = schema_6[_q];
        var tableName = sanitizeIdentifier(item.id).toLowerCase();
        rlsLines.push("ALTER TABLE \"".concat(tableName, "\" ENABLE ROW LEVEL SECURITY;"));
        rlsLines.push("-- TODO(marker): create policy for ".concat(item.user_type_ref));
    }
    rlsLines.push("");
    var migrationLines = [
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
            content: "".concat(yamlLines.join("\n"), "\n"),
        },
        {
            path: "agent/schema/uds.prisma",
            content: "".concat(prismaLines.join("\n"), "\n"),
        },
        {
            path: "agent/schema/uds.ddl.sql",
            content: "".concat(ddlLines.join("\n"), "\n"),
        },
        {
            path: "agent/schema/uds.graphql",
            content: "".concat(graphqlLines.join("\n"), "\n"),
        },
        {
            path: "agent/schema/uds.types.ts",
            content: "".concat(typesLines.join("\n"), "\n"),
        },
        {
            path: "agent/schema/rls.sql",
            content: "".concat(rlsLines.join("\n"), "\n"),
        },
        {
            path: "agent/schema/migrations/0001_uds_scaffold.sql",
            content: "".concat(migrationLines.join("\n"), "\n"),
        },
    ];
}
