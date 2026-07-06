"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decomposeUrlTemplate = decomposeUrlTemplate;
var TEMPLATE_PATTERN = /^\[[^\]]+\]$/;
function decomposeUrlTemplate(rawUrl) {
    var parsed = new URL(rawUrl);
    var pathSegments = parsed.pathname.split("/").filter(function (segment) { return segment.length > 0; });
    var pathParams = [];
    var normalizedPathSegments = pathSegments.map(function (segment) {
        if (TEMPLATE_PATTERN.test(segment)) {
            var name_1 = segment.slice(1, -1);
            pathParams.push(name_1);
            return "{".concat(name_1, "}");
        }
        return segment;
    });
    var queryParams = [];
    for (var _i = 0, _a = parsed.searchParams.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], name_2 = _b[0], value = _b[1];
        var templated = TEMPLATE_PATTERN.test(value);
        queryParams.push({
            name: name_2,
            templated: templated,
            value: templated ? null : value,
        });
    }
    return {
        serverUrl: "".concat(parsed.protocol, "//").concat(parsed.host),
        path: "/".concat(normalizedPathSegments.join("/")),
        pathParams: pathParams,
        queryParams: queryParams,
    };
}
