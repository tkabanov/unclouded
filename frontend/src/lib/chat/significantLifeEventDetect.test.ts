import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import {
  detectSignificantLifeEventDisclosure,
  detectSignificantLifeEventInThread,
  readSignificantLifeEventFlag,
} from "../../../../supabase/functions/chat/significantLifeEventDetect.ts";

describe("detectSignificantLifeEventDisclosure", () => {
  it("detects job loss disclosures", () => {
    expect(detectSignificantLifeEventDisclosure("I got laid off on Friday.")).toBe(true);
    expect(detectSignificantLifeEventDisclosure("They fired me yesterday.")).toBe(true);
  });

  it("detects bereavement disclosures", () => {
    expect(detectSignificantLifeEventDisclosure("My dad passed away last week.")).toBe(true);
    expect(detectSignificantLifeEventDisclosure("I lost my mother in March.")).toBe(true);
  });

  it("detects explicit mid-cycle shift language", () => {
    expect(detectSignificantLifeEventDisclosure("Everything has changed since we last talked.")).toBe(
      true,
    );
    expect(detectSignificantLifeEventDisclosure("I'm in a completely different place now.")).toBe(
      true,
    );
  });

  it("detects relapse and health disclosures", () => {
    expect(detectSignificantLifeEventDisclosure("I relapsed over the weekend.")).toBe(true);
    expect(detectSignificantLifeEventDisclosure("I was diagnosed with cancer.")).toBe(true);
  });

  it("detects relationship rupture disclosures", () => {
    expect(detectSignificantLifeEventDisclosure("My wife left me last month.")).toBe(true);
    expect(detectSignificantLifeEventDisclosure("We're getting divorced.")).toBe(true);
  });

  it("ignores session markers and routine coaching talk", () => {
    expect(detectSignificantLifeEventDisclosure("[SESSION START]")).toBe(false);
    expect(detectSignificantLifeEventDisclosure("Work has been stressful lately.")).toBe(false);
    expect(detectSignificantLifeEventDisclosure("I had a breakthrough on boundaries.")).toBe(false);
  });
});

describe("detectSignificantLifeEventInThread", () => {
  it("scans all user turns in the thread", () => {
    const messages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Mostly the same as last week." }] },
      {
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "What feels most present today?" }],
      },
      {
        id: "3",
        role: "user",
        parts: [{ type: "text", text: "Actually, I lost my job yesterday." }],
      },
    ];

    expect(detectSignificantLifeEventInThread(messages)).toBe(true);
  });

  it("includes optional extra context text", () => {
    expect(
      detectSignificantLifeEventInThread([], "My partner and I separated over the weekend."),
    ).toBe(true);
  });
});

describe("readSignificantLifeEventFlag", () => {
  it("reads snake_case and camelCase onboarding keys", () => {
    expect(readSignificantLifeEventFlag({ significant_life_event_flag: true })).toBe(true);
    expect(readSignificantLifeEventFlag({ significantLifeEventFlag: true })).toBe(true);
    expect(readSignificantLifeEventFlag({ significant_life_event_flag: false })).toBe(false);
  });
});
