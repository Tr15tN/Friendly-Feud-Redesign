import { Game } from "@/types/game";
import { describe, expect, it } from "vitest";
import type { KeyValueStorage } from "./keys";
import { DEFAULT_LIGHTS, lightEventFor, loadLights, parseEscapes, parseWebhook, saveLights } from "./lights";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = { ...initial };
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

function gameWith(buzzed: unknown[], players: Record<string, { team: number | null }> = {}): Game {
  return { buzzed, registeredPlayers: players } as unknown as Game;
}

describe("lightEventFor", () => {
  it("is off with no buzz and while there is no game", () => {
    expect(lightEventFor(null)).toBe("off");
    expect(lightEventFor(gameWith([]))).toBe("off");
  });

  it("follows the team of the first buzz, from a player or from a team button", () => {
    expect(lightEventFor(gameWith([{ id: "p1", time: 1, team: null }], { p1: { team: 1 } }))).toBe("team1");
    expect(lightEventFor(gameWith([{ id: "", time: 1, team: 0 }]))).toBe("team0");
  });

  it("is pending for a shared-buzzer press nobody has assigned yet", () => {
    expect(lightEventFor(gameWith([{ id: "", time: 1, team: null }]))).toBe("pending");
  });

  it("only looks at the first buzz", () => {
    const game = gameWith(
      [
        { id: "p1", time: 1, team: null },
        { id: "p2", time: 2, team: null },
      ],
      { p1: { team: 0 }, p2: { team: 1 } }
    );
    expect(lightEventFor(game)).toBe("team0");
  });
});

describe("parseEscapes", () => {
  it("turns escapes into bytes", () => {
    expect(Array.from(parseEscapes("1\\n"))).toEqual([49, 10]);
    expect(Array.from(parseEscapes("\\xA0\\x01\\x01\\xA2"))).toEqual([0xa0, 1, 1, 0xa2]);
    expect(Array.from(parseEscapes("a\\r\\t\\\\"))).toEqual([97, 13, 9, 92]);
  });

  it("leaves a lone backslash or a broken \\x alone", () => {
    expect(Array.from(parseEscapes("\\"))).toEqual([92]);
    expect(Array.from(parseEscapes("\\xZZ"))).toEqual([92, 120, 90, 90]);
  });

  it("encodes other text as UTF-8", () => {
    expect(Array.from(parseEscapes("õ"))).toEqual([0xc3, 0xb5]);
  });
});

describe("parseWebhook", () => {
  it("defaults to GET and accepts a method", () => {
    expect(parseWebhook("http://10.0.0.5/win&T=1")).toEqual({ method: "GET", url: "http://10.0.0.5/win&T=1" });
    expect(parseWebhook("post https://example.com/hook")).toEqual({ method: "POST", url: "https://example.com/hook" });
  });

  it("ignores empty or non-http entries", () => {
    expect(parseWebhook("")).toBeNull();
    expect(parseWebhook("javascript:alert(1)")).toBeNull();
    expect(parseWebhook("ftp://x")).toBeNull();
  });
});

describe("lights settings", () => {
  it("defaults to off", () => {
    expect(loadLights(memoryStorage())).toEqual(DEFAULT_LIGHTS);
  });

  it("round-trips and fills in anything missing", () => {
    const storage = memoryStorage();
    const config = {
      ...DEFAULT_LIGHTS,
      mode: "webhook" as const,
      webhook: { ...DEFAULT_LIGHTS.webhook, team0: "http://a" },
    };
    saveLights(storage, config);
    expect(loadLights(storage)).toEqual(config);
    const partial = memoryStorage({ "famf.buzzerLights": '{"mode":"serial","serial":{"team0":"X"}}' });
    const loaded = loadLights(partial);
    expect(loaded.mode).toBe("serial");
    expect(loaded.serial.team0).toBe("X");
    expect(loaded.serial.team1).toBe(DEFAULT_LIGHTS.serial.team1);
  });

  it("ignores corrupt data and nonsense values", () => {
    expect(loadLights(memoryStorage({ "famf.buzzerLights": "nope" }))).toEqual(DEFAULT_LIGHTS);
    const bad = loadLights(memoryStorage({ "famf.buzzerLights": '{"mode":"rm -rf","baud":-5}' }));
    expect(bad.mode).toBe("off");
    expect(bad.baud).toBe(9600);
  });
});
