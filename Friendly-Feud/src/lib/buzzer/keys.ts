/** Key bindings for the physical buzzer. The buzzer acts like a keyboard, so any key can be bound. */

export interface KeyBinding {
  /** Physical key (KeyboardEvent.code), so it works on any keyboard layout. */
  code: string;
  /** What to show the user. */
  label: string;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = "famf.buzzerKeys";
export const DEFAULT_BINDINGS: KeyBinding[] = [{ code: "Enter", label: "Enter" }];

function isBinding(value: unknown): value is KeyBinding {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as KeyBinding).code === "string" &&
    typeof (value as KeyBinding).label === "string" &&
    (value as KeyBinding).code !== ""
  );
}

export function loadBindings(storage: KeyValueStorage): KeyBinding[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "");
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isBinding)) {
      return parsed.map(({ code, label }) => ({ code, label }));
    }
  } catch {
    // fall through to the default
  }
  return DEFAULT_BINDINGS.map((b) => ({ ...b }));
}

export function saveBindings(storage: KeyValueStorage, bindings: KeyBinding[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

export function addBinding(bindings: KeyBinding[], binding: KeyBinding): KeyBinding[] {
  if (bindings.some((b) => b.code === binding.code)) return bindings;
  return [...bindings, binding];
}

/** Remove a key, but always keep at least one so the buzzer cannot be left unbound. */
export function removeBinding(bindings: KeyBinding[], code: string): KeyBinding[] {
  const next = bindings.filter((b) => b.code !== code);
  return next.length > 0 ? next : bindings;
}

interface BuzzKeyEvent {
  code: string;
  repeat: boolean;
  target: EventTarget | null;
}

/** True when this key press should count as a buzz. */
export function isBuzzKey(event: BuzzKeyEvent, bindings: KeyBinding[]): boolean {
  if (event.repeat) return false;
  const tag = (event.target as { tagName?: string } | null)?.tagName?.toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return false;
  return bindings.some((b) => b.code === event.code);
}

/** A readable name for a key press, used when binding. */
export function keyLabel(event: { code: string; key: string }): string {
  const { code, key } = event;
  if (code === "Space") return "Space";
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (code.startsWith("Numpad")) return `Numpad ${code.slice(6).replace(/([a-z])([A-Z])/g, "$1 $2")}`;
  if (key.length === 1) return key.toUpperCase();
  return key || code;
}
