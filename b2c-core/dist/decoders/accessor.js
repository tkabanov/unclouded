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
exports.sourceObservedRuntimeAccessorCatalog = sourceObservedRuntimeAccessorCatalog;
exports.buildRuntimeAccessorCatalog = buildRuntimeAccessorCatalog;
exports.decodeAccessor = decodeAccessor;
exports.accessorRefToJson = accessorRefToJson;
var index_js_1 = require("../utils/index.js");
var SOURCE_OBSERVED_RUNTIME_ACCESSORS = new Set([
    "_id",
    "addres_qty_number",
    "AppIsTest",
    "and_",
    "approval_type_option__approval_type",
    "assign_to_user",
    "assigned_users_list_user",
    "assosiated_documents_custom_associated_documents",
    "attached_files_list_file",
    "boolean_status",
    "category",
    "category_new_custom_module_category",
    "ceil",
    "chat_list_custom_chat",
    "company_custom_company",
    "company_subscription_custom_company_subscription",
    "contains",
    "conversationalists_list_user",
    "convert_to_list",
    "convert_to_number",
    "count",
    "Created By",
    "Current Date/Time",
    "current_condition_images_list_image",
    "current_step_custom_step",
    "custom.block_files_",
    "custom.categories_",
    "custom.categories_deleted_",
    "custom.chat_",
    "custom.current_date_",
    "custom.deal_documents_",
    "custom.delete_",
    "custom.delete_chat_",
    "custom.delete_folder_",
    "custom.delete_members_",
    "custom.delete_user_",
    "custom.deleted_files_",
    "custom.document_",
    "custom.f_category_",
    "custom.file_",
    "custom.files_",
    "custom.filter_deal_address_",
    "custom.filter_deal_agent_",
    "custom.filter_deal_client_name_",
    "custom.filter_deal_closing_date_",
    "custom.filter_deal_search_text_",
    "custom.filter_deal_shared_status_",
    "custom.filter_deal_status_",
    "custom.is_sort_descending_",
    "custom.new_",
    "custom.os_account_type_",
    "custom.qty_",
    "custom.reply_",
    "custom.saved_files_",
    "custom.sop_",
    "custom.sorting_field_",
    "custom.starting_after_",
    "custom.step_",
    "custom.task_tab_",
    "custom.upd_",
    "custom.user_",
    "custom.video_",
    "custom.view_count_items_",
    "deal_documents_list_custom_deal_document",
    "department_custom_department",
    "departments_list_custom_department",
    "display",
    "divide",
    "document_attached_custom_document",
    "document_custom_document",
    "document_qms_custom_document_qms",
    "document_qms_list_custom_document_qms",
    "documents_in_task_list_custom_deal_document",
    "documents_list_custom_deal_document",
    "equals",
    "extract_from_date",
    "file_file",
    "files_list_file",
    "filtered",
    "first_element",
    "folder_custom_folder",
    "format_as_text",
    "format_boolean",
    "get_AAD",
    "get_ADG",
    "get_data",
    "get_group_data",
    "get_list_data",
    "group_avatar_image",
    "images_list_image",
    "invitation_status_option_os_company_invite_status",
    "is_common_tab",
    "is_not_empty",
    "is_true",
    "is_visible",
    "last_element",
    "lender_user",
    "limit_to",
    "list_from",
    "live_id",
    "main_admin_user",
    "max",
    "merged_with",
    "min",
    "minus",
    "minus_element",
    "minus_list",
    "module_block_list_custom_module",
    "module_type0",
    "nav_qms0",
    "not_equals",
    "num",
    "or_",
    "or_",
    "page_number",
    "param_bTJfH0",
    "param_bTJkY",
    "param_bTMvQ",
    "param_bTMWB",
    "param_bUGta0",
    "param_bUGtb0",
    "param_bUGtf0",
    "param_bUGtg0",
    "param_bUGth0",
    "param_bUGtl0",
    "param_bUGtm0",
    "param_bUGtn0",
    "param_bUGtr0",
    "param_bUGtU0",
    "param_bUGtV0",
    "param_bUGtZ0",
    "param_bUJlV",
    "path_list_custom_folder",
    "photo_image",
    "pickup_options_list_option_os__pickup_options",
    "plus",
    "plus_days",
    "plus_element",
    "priority_option__priority",
    "reply_custom_message",
    "rounded_down",
    "si_id_text",
    "sign_tabs_all_list_text",
    "sorted",
    "split_by",
    "status_option_os_company_invite_status",
    "status_option_os_complaint_status",
    "status_option_os_form_status",
    "status_option_os_workflow_status",
    "step_list_custom_step",
    "steps_list_custom_step",
    "stripe_id_text",
    "stripe_onboarding_complete__boolean",
    "stripe_price_id_text",
    "stripe_subscription_custom_stripe_subscription",
    "sub_id_text",
    "subscription_custom_company_subscription",
    "subscription_custom_subscription",
    "subtabs0",
    "test_id",
    "to_lowercase",
    "type_option__tabs_dashboard",
    "type0",
    "unique",
    "url",
    "user_user",
    "users_list_user",
    "users_passed_list_user",
    "video_file",
    "workflow_custom_workflow",
]);
function sourceObservedRuntimeAccessorCatalog() {
    return SOURCE_OBSERVED_RUNTIME_ACCESSORS;
}
function buildRuntimeAccessorCatalog(root) {
    var names = new Set();
    var walk = function (value) {
        if (Array.isArray(value)) {
            for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
                var item = value_1[_i];
                walk(item);
            }
            return;
        }
        if (!(0, index_js_1.isRecord)(value)) {
            return;
        }
        if (typeof value.name === "string" && value.name.length > 0) {
            names.add(value.name);
        }
        for (var _a = 0, _b = Object.values(value); _a < _b.length; _a++) {
            var child = _b[_a];
            walk(child);
        }
    };
    walk(root);
    return names;
}
function collectStringLeaves(value, out) {
    if (typeof value === "string") {
        out.add(value);
        return;
    }
    if (Array.isArray(value)) {
        for (var _i = 0, value_2 = value; _i < value_2.length; _i++) {
            var child = value_2[_i];
            collectStringLeaves(child, out);
        }
        return;
    }
    if (!(0, index_js_1.isRecord)(value)) {
        return;
    }
    for (var _a = 0, _b = Object.values(value); _a < _b.length; _a++) {
        var child = _b[_a];
        collectStringLeaves(child, out);
    }
}
function decodeCustomNameLookup(raw, customNameToId) {
    if (!customNameToId || !Object.hasOwn(customNameToId, raw)) {
        return null;
    }
    var leaves = new Set();
    collectStringLeaves(customNameToId[raw], leaves);
    return {
        raw: raw,
        kind: "custom_name_lookup",
        precedence: "custom_name_to_id",
        isUnknown: false,
        resolver: {
            strategy: "custom_name_to_id_lookup",
            lookup_key: raw,
            candidate_ids: __spreadArray([], leaves, true).sort(function (a, b) { return a.localeCompare(b); }),
        },
    };
}
function runtimeCatalogHas(raw, catalog) {
    if (catalog instanceof Set) {
        return catalog.has(raw);
    }
    if (Array.isArray(catalog)) {
        return catalog.includes(raw);
    }
    return false;
}
function looksLikeBubbleRuntimeAccessor(raw, options) {
    var _a;
    var patternMatch = /^param_[a-zA-Z0-9_]+$/.test(raw) ||
        /^get_[a-zA-Z0-9_]+$/.test(raw) ||
        /^custom[._]/.test(raw) ||
        raw.includes("_custom_");
    return (raw === "sorted" ||
        raw === "filtered" ||
        raw === "minus_element" ||
        raw === "convert_to_list" ||
        raw === "Created By" ||
        raw === "Current Date/Time" ||
        raw === "AppIsTest" ||
        (!options.strict && patternMatch) ||
        runtimeCatalogHas(raw, (_a = options.runtimeAccessorCatalog) !== null && _a !== void 0 ? _a : null) ||
        (!options.strict && runtimeCatalogHas(raw, SOURCE_OBSERVED_RUNTIME_ACCESSORS)) ||
        (!options.strict && /^[_A-Za-z][_A-Za-z0-9.:-]*$/.test(raw)));
}
function decodeAccessor(raw, options) {
    var _a;
    if (options === void 0) { options = {}; }
    if (raw.startsWith("_api_c2_")) {
        return {
            raw: raw,
            kind: "external_api_field",
            precedence: "_api_c2",
            isUnknown: false,
            resolver: {
                strategy: "external_call_types_field",
                lookup_key: raw,
                candidate_ids: [],
            },
        };
    }
    if (raw.startsWith("role_option_")) {
        var suffix = raw.slice("role_option_".length);
        if (options.strict && suffix.length === 0) {
            throw new Error("Unknown accessor: role_option_");
        }
        return {
            raw: raw,
            kind: "privacy_role_option",
            precedence: "role_option",
            isUnknown: false,
            resolver: {
                strategy: "privacy_role_inventory_match",
                lookup_key: suffix.length > 0 ? suffix : null,
                candidate_ids: [],
            },
        };
    }
    var customLookup = decodeCustomNameLookup(raw, (_a = options.customNameToId) !== null && _a !== void 0 ? _a : null);
    if (customLookup) {
        return customLookup;
    }
    if (raw.startsWith("custom_state_")) {
        var suffix = raw.slice("custom_state_".length);
        return {
            raw: raw,
            kind: "custom_state_ref",
            precedence: "custom_state",
            isUnknown: false,
            resolver: {
                strategy: "custom_state_suffix_match",
                lookup_key: suffix.length > 0 ? suffix : null,
                candidate_ids: [],
            },
        };
    }
    if (looksLikeBubbleRuntimeAccessor(raw, options)) {
        return {
            raw: raw,
            kind: "bubble_runtime_accessor",
            precedence: "none",
            isUnknown: false,
            resolver: {
                strategy: "bubble_runtime_pattern",
                lookup_key: raw,
                candidate_ids: [],
            },
        };
    }
    if (options.strict) {
        throw new Error("Unknown accessor: ".concat(raw));
    }
    return {
        raw: raw,
        kind: "unknown",
        precedence: "none",
        isUnknown: true,
        resolver: {
            strategy: "none",
            lookup_key: null,
            candidate_ids: [],
        },
    };
}
function accessorRefToJson(ref) {
    return {
        raw: ref.raw,
        kind: ref.kind,
        precedence: ref.precedence,
        isUnknown: ref.isUnknown,
        resolver: {
            strategy: ref.resolver.strategy,
            lookup_key: ref.resolver.lookup_key,
            candidate_ids: ref.resolver.candidate_ids,
        },
    };
}
