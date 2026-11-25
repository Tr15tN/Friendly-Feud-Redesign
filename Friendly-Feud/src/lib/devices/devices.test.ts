import { describe, expect, it } from "vitest";
import {
  clearCredentials,
  connectLink,
  DeviceInfo,
  formatCodeInput,
  formatCountdown,
  isCompleteCode,
  loadCredentials,
  onlineCount,
  saveCredentials,
  secondsLeft,
} from "./devices";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe("pairing codes", () => {
  it("formats what the person types", () => {
    expect(formatCodeInput("abcdk7p2")).toBe("ABCD-K7P2");
    expect(formatCodeInput("ab")).toBe("AB");
    expect(formatCodeInput("abcd-k7p2zzz")).toBe("ABCD-K7P2");
    expect(formatCodeInput(" ab cd ")).toBe("ABCD");
  });

  it("knows when a code is complete", () => {
    expect(isCompleteCode("ABCD-K7P2")).toBe(true);
    expect(isCompleteCode("ABCD-K7P")).toBe(false);
    expect(isCompleteCode("ABCDK7P2")).toBe(false);
  });

  it("builds the link a device opens", () => {
    expect(connectLink("https://m0usetrap.ee", "ABCD-K7P2")).toBe("https://m0usetrap.ee/connect?code=ABCD-K7P2");
    expect(connectLink("https://m0usetrap.ee/")).toBe("https://m0usetrap.ee/connect");
  });

  it("counts down without going below zero", () => {
    expect(secondsLeft(10_000, 4_500)).toBe(6);
    expect(secondsLeft(10_000, 20_000)).toBe(0);
    expect(secondsLeft(undefined, 0)).toBe(0);
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(65)).toBe("1:05");
    expect(formatCountdown(0)).toBe("0:00");
  });
});

describe("device credentials", () => {
  it("round-trips and clears", () => {
    const storage = memoryStorage();
    expect(loadCredentials(storage)).toBeNull();
    saveCredentials(storage, { room: "ABCD", id: "x", token: "t", name: "TV", roles: ["tv", "lights"] });
    expect(loadCredentials(storage)).toEqual({
      room: "ABCD",
      id: "x",
      token: "t",
      name: "TV",
      roles: ["tv", "lights"],
    });
    clearCredentials(storage);
    expect(loadCredentials(storage)).toBeNull();
  });

  it("treats broken or foreign data as no credentials and drops unknown roles", () => {
    const storage = memoryStorage();
    storage.setItem("famf.device", "not json");
    expect(loadCredentials(storage)).toBeNull();
    storage.setItem("famf.device", JSON.stringify({ room: "ABCD" }));
    expect(loadCredentials(storage)).toBeNull();
    storage.setItem("famf.device", JSON.stringify({ room: "ABCD", id: "x", token: "t", roles: ["tv", "admin"] }));
    expect(loadCredentials(storage)?.roles).toEqual(["tv"]);
  });
});

describe("onlineCount", () => {
  it("counts paired devices that are connected", () => {
    const base: DeviceInfo = { id: "1", name: "a", roles: ["tv"], paired: true, connected: true };
    expect(
      onlineCount([base, { ...base, id: "2", connected: false }, { ...base, id: "3", paired: false, connected: false }])
    ).toBe(1);
  });
});
