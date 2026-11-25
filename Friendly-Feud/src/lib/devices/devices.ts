/** What a paired device is for. A device can have several roles. */
export const DEVICE_ROLES = ["tv", "buzzers", "lights"] as const;
export type DeviceRole = (typeof DEVICE_ROLES)[number];

/** A device as the host console sees it (the server never sends tokens). */
export interface DeviceInfo {
  id: string;
  name: string;
  roles: DeviceRole[];
  paired: boolean;
  connected: boolean;
  /** Only while waiting to be paired: "ABCD-K7P2". */
  code?: string;
  /** Unix milliseconds. */
  codeExpires?: number;
  expired?: boolean;
}

/** Credentials a paired device keeps in localStorage. */
export interface DeviceCredentials {
  room: string;
  id: string;
  token: string;
  name: string;
  roles: DeviceRole[];
}

const STORAGE_KEY = "famf.device";

export function hasRole(roles: readonly string[] | undefined, role: DeviceRole): boolean {
  return !!roles && roles.includes(role);
}

/** The page a device opens: the address to type, and the same thing as a link with the code filled in. */
export function connectLink(origin: string, code?: string): string {
  const base = `${origin.replace(/\/$/, "")}/connect`;
  return code ? `${base}?code=${encodeURIComponent(code)}` : base;
}

/** Whole seconds until the code stops working (never negative). */
export function secondsLeft(codeExpires: number | undefined, now: number): number {
  if (!codeExpires) return 0;
  return Math.max(0, Math.ceil((codeExpires - now) / 1000));
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Shows what the person typed the way the server expects it: "abcdk7p2" becomes "ABCD-K7P2". */
export function formatCodeInput(raw: string): string {
  const clean = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}

export function isCompleteCode(code: string): boolean {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

export function loadCredentials(storage: Pick<Storage, "getItem">): DeviceCredentials | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.room === "string" &&
      typeof parsed?.id === "string" &&
      typeof parsed?.token === "string" &&
      Array.isArray(parsed?.roles)
    ) {
      return {
        room: parsed.room,
        id: parsed.id,
        token: parsed.token,
        name: typeof parsed.name === "string" ? parsed.name : "",
        roles: parsed.roles.filter((r: unknown): r is DeviceRole => DEVICE_ROLES.includes(r as DeviceRole)),
      };
    }
  } catch {
    // fall through: unreadable credentials count as none
  }
  return null;
}

export function saveCredentials(storage: Pick<Storage, "setItem">, credentials: DeviceCredentials) {
  storage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function clearCredentials(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(STORAGE_KEY);
}

/** Number of paired devices that are online right now. */
export function onlineCount(devices: readonly DeviceInfo[]): number {
  return devices.filter((d) => d.paired && d.connected).length;
}
