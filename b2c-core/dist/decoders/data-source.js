"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeDataSource = decodeDataSource;
var index_js_1 = require("../utils/index.js");
var DIRECT_KIND_BY_TYPE = {
    ElementParent: "parent_data",
    Search: "search",
    AllOptionValue: "option_set_value",
    OneOptionValue: "option_set_value",
    OptionValue: "option_set_value",
    CurrentUser: "current_user",
    CurrentPageItem: "current_page_item",
    GetElement: "element_ref",
    ThisElement: "this_element",
    CurrentWorkflowItem: "current_workflow_item",
    ArbitraryText: "arbitrary_text",
    GetParamFromUrl: "url_param",
    PreviousStep: "previous_step",
    APIEventParameter: "api_event_param",
};
function containsMessageNameWithPrefix(value, prefix) {
    if (Array.isArray(value)) {
        return value.some(function (child) { return containsMessageNameWithPrefix(child, prefix); });
    }
    if (!(0, index_js_1.isRecord)(value)) {
        return false;
    }
    if (typeof value.name === "string" && value.name.startsWith(prefix)) {
        return true;
    }
    return Object.values(value).some(function (child) { return containsMessageNameWithPrefix(child, prefix); });
}
function decodeDataSource(rawValue) {
    if (typeof rawValue === "number" || typeof rawValue === "boolean" || rawValue === null) {
        return {
            kind: "opaque_scalar",
            sourceType: null,
            isUnknown: false,
        };
    }
    if (!(0, index_js_1.isRecord)(rawValue)) {
        return {
            kind: "unknown",
            sourceType: null,
            isUnknown: true,
        };
    }
    var sourceType = (0, index_js_1.getString)(rawValue.type);
    if (!sourceType) {
        return {
            kind: "unknown",
            sourceType: null,
            isUnknown: true,
        };
    }
    if (sourceType === "GetDataFromAPI") {
        return {
            kind: containsMessageNameWithPrefix(rawValue, "_api_c2_") ? "external_api_result" : "api_result",
            sourceType: sourceType,
            isUnknown: false,
        };
    }
    var directKind = DIRECT_KIND_BY_TYPE[sourceType];
    if (directKind) {
        return {
            kind: directKind,
            sourceType: sourceType,
            isUnknown: false,
        };
    }
    return {
        kind: "unknown",
        sourceType: sourceType,
        isUnknown: true,
    };
}
