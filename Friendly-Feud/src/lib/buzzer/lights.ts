import { Game } from "@/types/game";
import { KeyValueStorage } from "./keys";

/**
 * Lights that go on when a team buzzes. They are driven from the buzzers laptop, from what the game says
 * (who is first right now), so they work for phone buzzes and physical buzzers alike and go off when the host
 * clears the buzzers.
 */
export type LightEvent = "team0" | "team1" | "pending" | "off";
export const LIGHT_EVENTS: LightEvent[] = ["team0", "team1", "pending", "off"];

export type LightsMode = "off" | "serial" | "webhook";

export interface LightsConfig {
  mode: LightsMode;
  /** Serial speed, for Arduino-style boards and USB relays. */
  baud: number;
  /** What to write to the serial port for each event. Supports \n \r \t \\ and \xNN escapes. */
  serial: Record<LightEvent, string>;
  /** What to call for each event: a URL, optionally with a method in front ("POST http://..."). */
  webhook: Record<LightEvent, string>;
}

export const LIGHTS_STORAGE_KEY = "famf.buzzerLights";

export const DEFAULT_LIGHTS: LightsConfig = {
  mode: "off",
  baud: 9600,
  serial: { team0: "1\\n", team1: "2\\n", pending: "3\\n", off: "0\\n" },
  webhook: { team0: "", team1: "", pending: "", off: "" },
};

function cloneDefaults(): LightsConfig {
  return { ...DEFAULT_LIGHTS, serial: { ...DEFAULT_LIGHTS.serial }, webhook: { ...DEFAULT_LIGHTS.webhook } };
}

function readEvents(value: unknown, fallback: Record<LightEvent, string>): Record<LightEvent, string> {
  const result = { ...fallback };
  if (typeof value === "object" && value !== null) {
    for (const event of LIGHT_EVENTS) {
      const text = (value as Record<string, unknown>)[event];
      if (typeof text === "string") result[event] = text;
    }
  }
  return result;
}

export function loadLights(storage: KeyValueStorage): LightsConfig {
  const config = cloneDefaults();
  try {
    const parsed = JSON.parse(storage.getItem(LIGHTS_STORAGE_KEY) ?? "") as Record<string, unknown>;
    if (parsed.mode === "serial" || parsed.mode === "webhook" || parsed.mode === "off") config.mode = parsed.mode;
    if (typeof parsed.baud === "number" && parsed.baud > 0 && parsed.baud <= 4000000) config.baud = parsed.baud;
    config.serial = readEvents(parsed.serial, config.serial);
    config.webhook = readEvents(parsed.webhook, config.webhook);
  } catch {
    // fall through to the defaults
  }
  return config;
}

export function saveLights(storage: KeyValueStorage, config: LightsConfig): void {
  storage.setItem(LIGHTS_STORAGE_KEY, JSON.stringify(config));
}

/** Which light state the game is in right now. */
export function lightEventFor(game: Game | null): LightEvent {
  const first = game?.buzzed?.[0];
  if (!first) return "off";
  const team = first.id ? game?.registeredPlayers?.[first.id]?.team : first.team;
  if (team === 0) return "team0";
  if (team === 1) return "team1";
  return "pending";
}

/** Turn a typed string like `A0\x01\n` into the bytes to send. Anything else is sent as-is (UTF-8). */
export function parseEscapes(text: string): Uint8Array {
  const bytes: number[] = [];
  const encoder = new TextEncoder();
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\\" && i + 1 < text.length) {
      const next = text[i + 1];
      if (next === "n") (bytes.push(10), i++);
      else if (next === "r") (bytes.push(13), i++);
      else if (next === "t") (bytes.push(9), i++);
      else if (next === "\\") (bytes.push(92), i++);
      else if (next === "x" && /^[0-9a-fA-F]{2}$/.test(text.slice(i + 2, i + 4))) {
        bytes.push(parseInt(text.slice(i + 2, i + 4), 16));
        i += 3;
      } else bytes.push(...encoder.encode(char));
    } else {
      bytes.push(...encoder.encode(char));
    }
  }
  return Uint8Array.from(bytes);
}

export interface WebhookCall {
  method: "GET" | "POST" | "PUT";
  url: string;
}

/** "http://x" is a GET. "POST http://x" picks the method. Returns null for an empty or unusable entry. */
export function parseWebhook(text: string): WebhookCall | null {
  const match = text.trim().match(/^(?:(GET|POST|PUT)\s+)?(https?:\/\/\S+)$/i);
  if (!match) return null;
  return { method: (match[1]?.toUpperCase() as WebhookCall["method"] | undefined) ?? "GET", url: match[2] };
}

// Only the parts of the Web Serial API that are used here (it is not in every TypeScript lib).
interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
}
interface SerialLike {
  requestPort(): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
}

function getSerial(): SerialLike | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { serial?: SerialLike }).serial ?? null;
}

export function serialSupported(): boolean {
  return getSerial() !== null;
}

/** Sends light events to the serial port or webhooks. Failures never throw: a broken light must not stop the game. */
export class LightsController {
  private port: SerialPortLike | null = null;
  private queue: Promise<void> = Promise.resolve();
  public lastError = "";

  constructor(private config: LightsConfig) {}

  setConfig(config: LightsConfig) {
    this.config = config;
  }

  get connected(): boolean {
    return this.port !== null;
  }

  /** Ask the user for a port (needs a click). */
  async connect(): Promise<boolean> {
    const serial = getSerial();
    if (!serial) {
      this.lastError = "Web Serial is not available in this browser";
      return false;
    }
    try {
      const port = await serial.requestPort();
      await this.open(port);
      return true;
    } catch (error) {
      this.lastError = String(error);
      return false;
    }
  }

  /** Reuse a port the user already allowed on an earlier visit. */
  async reconnect(): Promise<boolean> {
    const serial = getSerial();
    if (!serial) return false;
    try {
      const ports = await serial.getPorts();
      if (ports.length === 0) return false;
      await this.open(ports[0]);
      return true;
    } catch (error) {
      this.lastError = String(error);
      return false;
    }
  }

  private async open(port: SerialPortLike) {
    await port.open({ baudRate: this.config.baud });
    this.port = port;
    this.lastError = "";
  }

  async disconnect() {
    const port = this.port;
    this.port = null;
    await port?.close().catch(() => undefined);
  }

  /** Fire an event. Calls are sent in order. */
  fire(event: LightEvent): Promise<void> {
    this.queue = this.queue.then(() => this.send(event)).catch(() => undefined);
    return this.queue;
  }

  private async send(event: LightEvent) {
    try {
      if (this.config.mode === "serial") {
        const text = this.config.serial[event];
        if (!this.port?.writable || !text) return;
        const writer = this.port.writable.getWriter();
        try {
          await writer.write(parseEscapes(text));
        } finally {
          writer.releaseLock();
        }
      } else if (this.config.mode === "webhook") {
        const call = parseWebhook(this.config.webhook[event]);
        if (!call) return;
        // The response is not needed, and most light controllers do not send CORS headers.
        await fetch(call.url, { method: call.method, mode: "no-cors" });
      }
      this.lastError = "";
    } catch (error) {
      this.lastError = String(error);
    }
  }
}
