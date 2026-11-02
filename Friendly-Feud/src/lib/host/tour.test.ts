import { describe, expect, it } from "vitest";
import { HOST_TOUR_STEPS, markTourDone, shouldAutoStartTour } from "./tour";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe("host tour", () => {
  it("has unique step ids and no empty texts", () => {
    const ids = HOST_TOUR_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const step of HOST_TOUR_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.body.length).toBeGreaterThan(0);
    }
  });

  it("starts for a first-time host", () => {
    expect(shouldAutoStartTour(fakeStorage(), false)).toBe(true);
  });

  it("does not start again once finished", () => {
    const storage = fakeStorage();
    markTourDone(storage);
    expect(shouldAutoStartTour(storage, false)).toBe(false);
  });

  it("does not start in automated browsers or when storage is unavailable", () => {
    expect(shouldAutoStartTour(fakeStorage(), true)).toBe(false);
    expect(shouldAutoStartTour(null, false)).toBe(true);
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(shouldAutoStartTour(broken, false)).toBe(false);
    expect(() => markTourDone(broken)).not.toThrow();
  });
});
