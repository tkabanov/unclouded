"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var strict_1 = require("node:assert/strict");
var node_test_1 = require("node:test");
var data_source_js_1 = require("../decoders/data-source.js");
var text_expression_hosts_js_1 = require("../decoders/text-expression-hosts.js");
var m1_js_1 = require("./m1.js");
var url_decompose_js_1 = require("../m2/views/url-decompose.js");
var m1_fixtures_js_1 = require("../test/fixtures/m1-fixtures.js");
(0, node_test_1.default)("M1 data source fixtures cover every decoder arm", function () {
    var seenKinds = new Set();
    for (var _i = 0, DATA_SOURCE_FIXTURES_1 = m1_fixtures_js_1.DATA_SOURCE_FIXTURES; _i < DATA_SOURCE_FIXTURES_1.length; _i++) {
        var fixture = DATA_SOURCE_FIXTURES_1[_i];
        var decoded = (0, data_source_js_1.decodeDataSource)(fixture.raw);
        strict_1.default.equal(decoded.kind, fixture.expectedKind, fixture.name);
        strict_1.default.equal(decoded.sourceType, fixture.expectedSourceType, fixture.name);
        strict_1.default.equal(decoded.isUnknown, fixture.expectedUnknown, fixture.name);
        seenKinds.add(decoded.kind);
    }
    for (var _a = 0, REQUIRED_DATA_SOURCE_KINDS_1 = m1_fixtures_js_1.REQUIRED_DATA_SOURCE_KINDS; _a < REQUIRED_DATA_SOURCE_KINDS_1.length; _a++) {
        var requiredKind = REQUIRED_DATA_SOURCE_KINDS_1[_a];
        strict_1.default.ok(seenKinds.has(requiredKind), "missing fixture for DataSourceIR kind ".concat(requiredKind));
    }
});
(0, node_test_1.default)("M1 text expression host fixtures cover every host class and fail closed", function () {
    var seenHostClasses = new Set();
    for (var _i = 0, TEXT_EXPRESSION_HOST_FIXTURES_1 = m1_fixtures_js_1.TEXT_EXPRESSION_HOST_FIXTURES; _i < TEXT_EXPRESSION_HOST_FIXTURES_1.length; _i++) {
        var fixture = TEXT_EXPRESSION_HOST_FIXTURES_1[_i];
        var hostClass = (0, text_expression_hosts_js_1.resolveTextExpressionHostClass)(fixture.pointer, fixture.hostKey);
        strict_1.default.equal(hostClass, fixture.expectedHostClass, fixture.name);
        if (hostClass) {
            seenHostClasses.add(hostClass);
        }
    }
    for (var _a = 0, REQUIRED_TEXT_EXPRESSION_HOST_CLASSES_1 = m1_fixtures_js_1.REQUIRED_TEXT_EXPRESSION_HOST_CLASSES; _a < REQUIRED_TEXT_EXPRESSION_HOST_CLASSES_1.length; _a++) {
        var requiredHostClass = REQUIRED_TEXT_EXPRESSION_HOST_CLASSES_1[_a];
        strict_1.default.ok(seenHostClasses.has(requiredHostClass), "missing fixture for TextExpression host class ".concat(requiredHostClass));
    }
    strict_1.default.ok(m1_fixtures_js_1.TEXT_EXPRESSION_HOST_FIXTURES.some(function (fixture) { return fixture.expectedHostClass === null; }), "fixtures must include unknown host fail-closed case");
});
(0, node_test_1.default)("M1 URL and body template fixtures validate declared parameter parity", function () {
    var _loop_1 = function (fixture) {
        var decomposed = (0, url_decompose_js_1.decomposeUrlTemplate)(fixture.urlTemplate);
        strict_1.default.equal(decomposed.path, fixture.expectedPath, fixture.name);
        strict_1.default.deepEqual(decomposed.pathParams, fixture.expectedPathParams, fixture.name);
        strict_1.default.deepEqual(decomposed.queryParams.filter(function (param) { return param.templated; }).map(function (param) { return param.name; }).sort(), fixture.expectedTemplatedQueryParams, fixture.name);
        var _loop_2 = function (name_1, value) {
            var queryParam = decomposed.queryParams.find(function (param) { return param.name === name_1; });
            strict_1.default.equal(queryParam === null || queryParam === void 0 ? void 0 : queryParam.value, value, fixture.name);
        };
        for (var _a = 0, _b = Object.entries(fixture.expectedLiteralQueryDefaults); _a < _b.length; _a++) {
            var _c = _b[_a], name_1 = _c[0], value = _c[1];
            _loop_2(name_1, value);
        }
        strict_1.default.deepEqual((0, m1_js_1.extractBodyTemplateRefs)(fixture.bodyTemplate), fixture.expectedBodyRefs, fixture.name);
        if (fixture.shouldPass) {
            strict_1.default.doesNotThrow(function () {
                return (0, m1_js_1.validateTemplateParams)(fixture.urlTemplate, fixture.bodyTemplate, fixture.declaredParams);
            });
        }
        else {
            strict_1.default.throws(function () {
                return (0, m1_js_1.validateTemplateParams)(fixture.urlTemplate, fixture.bodyTemplate, fixture.declaredParams);
            });
        }
    };
    for (var _i = 0, TEMPLATE_FIXTURES_1 = m1_fixtures_js_1.TEMPLATE_FIXTURES; _i < TEMPLATE_FIXTURES_1.length; _i++) {
        var fixture = TEMPLATE_FIXTURES_1[_i];
        _loop_1(fixture);
    }
});
(0, node_test_1.default)("M1 URL fixture rejects malformed relative templates", function () {
    strict_1.default.throws(function () { return (0, url_decompose_js_1.decomposeUrlTemplate)("/relative/path/[id]"); });
});
