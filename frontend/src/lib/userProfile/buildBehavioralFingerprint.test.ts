import { describe, expect, it } from "vitest";
import { resolveBehavioralFingerprint } from "./buildBehavioralFingerprint";

describe("resolveBehavioralFingerprint (bTICa / bTICV)", () => {
  const branches: Array<{
    pressure: string;
    followthrough: string;
    expected: string;
  }> = [
    {
      pressure: "avoid",
      followthrough: "waiting",
      expected: "Avoidant / Conditional — delays until conditions feel perfect",
    },
    {
      pressure: "avoid",
      followthrough: "overwhelm",
      expected: "Avoidant / Shutdown — withdraws when load exceeds capacity",
    },
    {
      pressure: "avoid",
      followthrough: "wrong_goal",
      expected: "Avoidant / Misaligned — avoids because goal isn't actually right",
    },
    {
      pressure: "overthink",
      followthrough: "motivation",
      expected: "Analytical / Motivation Gap — insight-rich, execution-poor",
    },
    {
      pressure: "overthink",
      followthrough: "wrong_goal",
      expected: "Analytical / Direction Seeker — overthinks because goal feels unclear",
    },
    {
      pressure: "overthink",
      followthrough: "overwhelm",
      expected: "Analytical / Paralyzed — analysis loops when overwhelmed",
    },
    {
      pressure: "push_through",
      followthrough: "motivation",
      expected: "Driver / Depletion Risk — pushes until fuel runs out",
    },
    {
      pressure: "push_through",
      followthrough: "overwhelm",
      expected: "Driver / Capacity Ceiling — high output until wall hits",
    },
    {
      pressure: "push_through",
      followthrough: "distraction",
      expected: "Driver / Scattered — effortful but not focused",
    },
    {
      pressure: "seek_help",
      followthrough: "distraction",
      expected: "Collaborative / Diffuse Focus — support-dependent, easily redirected",
    },
    {
      pressure: "seek_help",
      followthrough: "wrong_goal",
      expected: "Collaborative / Direction Seeker — uses others to find right path",
    },
    {
      pressure: "seek_help",
      followthrough: "motivation",
      expected: "Collaborative / Sustain Gap — needs external energy to maintain",
    },
  ];

  it.each(branches)(
    "branch ($pressure, $followthrough)",
    ({ pressure, followthrough, expected }) => {
      expect(resolveBehavioralFingerprint(pressure, followthrough)).toBe(expected);
    },
  );

  it("variable pressure ignores followthrough reason", () => {
    expect(resolveBehavioralFingerprint("variable", "motivation")).toBe(
      "Situationally Adaptive — no dominant pattern, context-dependent",
    );
    expect(resolveBehavioralFingerprint("variable", "waiting")).toBe(
      "Situationally Adaptive — no dominant pattern, context-dependent",
    );
  });

  it("returns empty string for undefined combinations", () => {
    expect(resolveBehavioralFingerprint("avoid", "motivation")).toBe("");
    expect(resolveBehavioralFingerprint("push_through", "waiting")).toBe("");
    expect(resolveBehavioralFingerprint("unknown", "motivation")).toBe("");
    expect(resolveBehavioralFingerprint("", "")).toBe("");
  });
});
