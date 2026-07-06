"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256Text = sha256Text;
exports.shortHash = shortHash;
var node_crypto_1 = require("node:crypto");
function sha256Text(input) {
    return (0, node_crypto_1.createHash)("sha256").update(input).digest("hex");
}
function shortHash(input, length) {
    if (length === void 0) { length = 6; }
    return sha256Text(input).slice(0, length);
}
