"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRegistry = buildRegistry;
var accept_m1_js_1 = require("./commands/accept-m1.js");
var phase6_accept_js_1 = require("./commands/phase6-accept.js");
var ingest_js_1 = require("./commands/ingest.js");
var invalidate_js_1 = require("./commands/invalidate.js");
var phase6_list_emitters_js_1 = require("./commands/phase6-list-emitters.js");
var phase6_materialize_js_1 = require("./commands/phase6-materialize.js");
function buildRegistry() {
    return new Map([
        ["ingest", ingest_js_1.runIngestCommand],
        ["invalidate", invalidate_js_1.runInvalidateCommand],
        ["phase6:materialize", phase6_materialize_js_1.runPhase6MaterializeCommand],
        ["accept:m1", accept_m1_js_1.runAcceptM1Command],
        ["accept:m2", phase6_accept_js_1.runAcceptM2Command],
        ["phase6:list-emitters", phase6_list_emitters_js_1.runPhase6ListEmittersCommand],
    ]);
}
