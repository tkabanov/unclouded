import { describe, expect, it } from "vitest";
import {
  buildPulseSparklineGeometry,
  normalizePulseSeries,
} from "./pulseSparkline";

describe("normalizePulseSeries", () => {
  it("keeps one point per day with the latest mood", () => {
    expect(
      normalizePulseSeries([
        { date: "2026-07-01T08:00:00.000Z", mood: 4 },
        { date: "2026-07-01T18:00:00.000Z", mood: 6 },
        { date: "2026-07-02", mood: 5 },
      ]),
    ).toEqual([
      { date: "2026-07-01", mood: 6 },
      { date: "2026-07-02", mood: 5 },
    ]);
  });
});

describe("buildPulseSparklineGeometry", () => {
  it("returns polyline coordinates for multiple points", () => {
    const geometry = buildPulseSparklineGeometry([
      { date: "2026-07-01", mood: 3 },
      { date: "2026-07-02", mood: 7 },
    ]);

    expect(geometry).not.toBeNull();
    expect(geometry?.polyline).toContain("2.00");
    expect(geometry?.lastPoint).not.toBeNull();
  });

  it("returns null when there is no data", () => {
    expect(buildPulseSparklineGeometry([])).toBeNull();
  });
});
