import assert from "node:assert/strict";
import test from "node:test";

import { decodeDataSource } from "../decoders/data-source.js";
import { resolveTextExpressionHostClass } from "../decoders/text-expression-hosts.js";
import { extractBodyTemplateRefs, validateTemplateParams } from "./m1.js";
import { decomposeUrlTemplate } from "../m2/views/url-decompose.js";
import {
  DATA_SOURCE_FIXTURES,
  REQUIRED_DATA_SOURCE_KINDS,
  REQUIRED_TEXT_EXPRESSION_HOST_CLASSES,
  TEMPLATE_FIXTURES,
  TEXT_EXPRESSION_HOST_FIXTURES,
} from "../test/fixtures/m1-fixtures.js";

test("M1 data source fixtures cover every decoder arm", () => {
  const seenKinds = new Set<string>();
  for (const fixture of DATA_SOURCE_FIXTURES) {
    const decoded = decodeDataSource(fixture.raw);
    assert.equal(decoded.kind, fixture.expectedKind, fixture.name);
    assert.equal(decoded.sourceType, fixture.expectedSourceType, fixture.name);
    assert.equal(decoded.isUnknown, fixture.expectedUnknown, fixture.name);
    seenKinds.add(decoded.kind);
  }
  for (const requiredKind of REQUIRED_DATA_SOURCE_KINDS) {
    assert.ok(seenKinds.has(requiredKind), `missing fixture for DataSourceIR kind ${requiredKind}`);
  }
});

test("M1 text expression host fixtures cover every host class and fail closed", () => {
  const seenHostClasses = new Set<string>();
  for (const fixture of TEXT_EXPRESSION_HOST_FIXTURES) {
    const hostClass = resolveTextExpressionHostClass(fixture.pointer, fixture.hostKey);
    assert.equal(hostClass, fixture.expectedHostClass, fixture.name);
    if (hostClass) {
      seenHostClasses.add(hostClass);
    }
  }
  for (const requiredHostClass of REQUIRED_TEXT_EXPRESSION_HOST_CLASSES) {
    assert.ok(
      seenHostClasses.has(requiredHostClass),
      `missing fixture for TextExpression host class ${requiredHostClass}`,
    );
  }
  assert.ok(
    TEXT_EXPRESSION_HOST_FIXTURES.some((fixture) => fixture.expectedHostClass === null),
    "fixtures must include unknown host fail-closed case",
  );
});

test("M1 URL and body template fixtures validate declared parameter parity", () => {
  for (const fixture of TEMPLATE_FIXTURES) {
    const decomposed = decomposeUrlTemplate(fixture.urlTemplate);
    assert.equal(decomposed.path, fixture.expectedPath, fixture.name);
    assert.deepEqual(decomposed.pathParams, fixture.expectedPathParams, fixture.name);
    assert.deepEqual(
      decomposed.queryParams.filter((param) => param.templated).map((param) => param.name).sort(),
      fixture.expectedTemplatedQueryParams,
      fixture.name,
    );
    for (const [name, value] of Object.entries(fixture.expectedLiteralQueryDefaults)) {
      const queryParam = decomposed.queryParams.find((param) => param.name === name);
      assert.equal(queryParam?.value, value, fixture.name);
    }
    assert.deepEqual(extractBodyTemplateRefs(fixture.bodyTemplate), fixture.expectedBodyRefs, fixture.name);
    if (fixture.shouldPass) {
      assert.doesNotThrow(() =>
        validateTemplateParams(fixture.urlTemplate, fixture.bodyTemplate, fixture.declaredParams),
      );
    } else {
      assert.throws(() =>
        validateTemplateParams(fixture.urlTemplate, fixture.bodyTemplate, fixture.declaredParams),
      );
    }
  }
});

test("M1 URL fixture rejects malformed relative templates", () => {
  assert.throws(() => decomposeUrlTemplate("/relative/path/[id]"));
});
