"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readM2GateState = readM2GateState;
function readM2GateState() {
    var enabled = process.env.B2C_ENABLE_M2 === "1";
    return {
        materializeEnabled: enabled,
        acceptanceEnabled: enabled,
    };
}
