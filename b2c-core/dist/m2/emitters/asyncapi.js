"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExternalCallSourceId = parseExternalCallSourceId;
exports.asyncApiChannelForNamespace = asyncApiChannelForNamespace;
exports.emitAsyncApiScaffold = emitAsyncApiScaffold;
function stableJson(value) {
    return "".concat(JSON.stringify(value, null, 2), "\n");
}
function sanitizeChannel(id) {
    return id.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function parseExternalCallSourceId(sourceId) {
    var prefix = "external_call:";
    if (!sourceId.startsWith(prefix)) {
        return { namespaceId: "unknown", callId: sourceId };
    }
    var remainder = sourceId.slice(prefix.length);
    var separator = remainder.indexOf(":");
    if (separator <= 0 || separator >= remainder.length - 1) {
        return { namespaceId: "unknown", callId: sourceId };
    }
    return {
        namespaceId: remainder.slice(0, separator),
        callId: remainder.slice(separator + 1),
    };
}
function asyncApiChannelForNamespace(namespaceId) {
    return "stream/".concat(sanitizeChannel(namespaceId));
}
function emitAsyncApiScaffold(views) {
    var _a, _b, _c, _d;
    var channelMessages = new Map();
    var channelMetadata = new Map();
    var messages = {};
    for (var _i = 0, _e = views.asyncapi_messages; _i < _e.length; _i++) {
        var message = _e[_i];
        var parsed = parseExternalCallSourceId(message.source_id);
        var channel = asyncApiChannelForNamespace(parsed.namespaceId);
        var currentMessages = (_a = channelMessages.get(channel)) !== null && _a !== void 0 ? _a : [];
        currentMessages.push(message.message_id);
        channelMessages.set(channel, currentMessages);
        channelMetadata.set(channel, { namespaceId: parsed.namespaceId });
        messages[message.message_id] = {
            name: message.message_id,
            title: "Async message for ".concat(message.source_id),
            summary: "Stream payload for ".concat(message.source_id),
            payload: { type: "object" },
            "x-b2c": {
                source_id: message.source_id,
                source_kind: "external_http_call",
                stream: true,
                source_namespace_id: parsed.namespaceId,
                source_call_id: parsed.callId,
            },
        };
    }
    var channels = {};
    for (var _f = 0, _g = __spreadArray([], channelMessages.keys(), true).sort(function (a, b) { return a.localeCompare(b); }); _f < _g.length; _f++) {
        var channel = _g[_f];
        var metadata = channelMetadata.get(channel);
        var messageIds = __spreadArray([], ((_b = channelMessages.get(channel)) !== null && _b !== void 0 ? _b : []), true).sort(function (a, b) { return a.localeCompare(b); });
        channels[channel] = {
            messages: messageIds,
            description: "Deterministic stream channel for namespace ".concat((_c = metadata === null || metadata === void 0 ? void 0 : metadata.namespaceId) !== null && _c !== void 0 ? _c : "unknown"),
            "x-b2c": {
                source_namespace_id: (_d = metadata === null || metadata === void 0 ? void 0 : metadata.namespaceId) !== null && _d !== void 0 ? _d : "unknown",
            },
        };
    }
    var document = {
        asyncapi: "3.0.0",
        info: {
            title: "M2 Streaming Baseline",
            version: "0.1.0-m2-baseline",
        },
        "x-b2c": {
            generated_from: "inventory+views",
            message_count: views.asyncapi_messages.length,
        },
        channels: channels,
        components: {
            messages: messages,
        },
    };
    return [
        {
            path: "agent/contracts/asyncapi.json",
            content: stableJson(document),
        },
    ];
}
