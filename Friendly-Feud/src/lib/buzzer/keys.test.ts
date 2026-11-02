import { describe, expect, it } from "vitest";
import {
  addBinding,
  DEFAULT_BINDINGS,
  isBuzzKey,
  keyLabel,
  loadBindings,
  removeBinding,
  saveBindings,
  type KeyValueStorage,
} from "./keys";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = { ...initial };
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe("loadBindings", () => {
  it("defaults to Enter when nothing is stored", () => {
    expect(loadBindings(memoryStorage())).toEqual(DEFAULT_BINDINGS);
    expect(DEFAULT_BINDINGS).toEqual([{ code: "Enter", label: "Enter" }]);
  });

  it("falls back to the default for corrupt or empty data", () => {
    expect(loadBindings(memoryStorage({ "famf.buzzerKeys": "not json" }))).toEqual(DEFAULT_BINDINGS);
    expect(loadBindings(memoryStorage({ "famf.buzzerKeys": "[]" }))).toEqual(DEFAULT_BINDINGS);
    expect(loadBindings(memoryStorage({ "famf.buzzerKeys": '[{"nope":1}]' }))).toEqual(DEFAULT_BINDINGS);
  });

  it("round-trips saved bindings", () => {
    const storage = memoryStorage();
    const bindings = [
      { code: "Space", label: "Space" },
      { code: "KeyB", label: "B" },
    ];
    saveBindings(storage, bindings);
    expect(loadBindings(storage)).toEqual(bindings);
  });
});

describe("addBinding / removeBinding", () => {
  it("adds a key once", () => {
    const first = addBinding(DEFAULT_BINDINGS, { code: "Space", label: " " });
    expect(first.map((b) => b.code)).toEqual(["Enter", "Space"]);
    expect(addBinding(first, { code: "Space", label: " " })).toHaveLength(2);
  });

  it("removes a key but never the last one", () => {
    const two = [
      { code: "Enter", label: "Enter" },
      { code: "Space", label: "Space" },
    ];
    expect(removeBinding(two, "Enter").map((b) => b.code)).toEqual(["Space"]);
    expect(removeBinding(DEFAULT_BINDINGS, "Enter")).toEqual(DEFAULT_BINDINGS);
  });
});

describe("isBuzzKey", () => {
  const event = (code: string, extra: Partial<{ repeat: boolean; tag: string }> = {}) => ({
    code,
    repeat: extra.repeat ?? false,
    target: { tagName: extra.tag ?? "BODY" } as unknown as EventTarget,
  });

  it("matches the physical key code", () => {
    expect(isBuzzKey(event("Enter"), DEFAULT_BINDINGS)).toBe(true);
    expect(isBuzzKey(event("Space"), DEFAULT_BINDINGS)).toBe(false);
  });

  it("ignores held-down auto repeat", () => {
    expect(isBuzzKey(event("Enter", { repeat: true }), DEFAULT_BINDINGS)).toBe(false);
  });

  it("ignores typing in form fields", () => {
    expect(isBuzzKey(event("Enter", { tag: "INPUT" }), DEFAULT_BINDINGS)).toBe(false);
    expect(isBuzzKey(event("Enter", { tag: "TEXTAREA" }), DEFAULT_BINDINGS)).toBe(false);
  });
});

describe("keyLabel", () => {
  it("shows readable names", () => {
    expect(keyLabel({ code: "Space", key: " " })).toBe("Space");
    expect(keyLabel({ code: "KeyB", key: "b" })).toBe("B");
    expect(keyLabel({ code: "Enter", key: "Enter" })).toBe("Enter");
    expect(keyLabel({ code: "NumpadEnter", key: "Enter" })).toBe("Numpad Enter");
    expect(keyLabel({ code: "F5", key: "F5" })).toBe("F5");
  });
});
