import type { OverlayHandle } from "@/components/Demo/Overlay";
import type { DemoServer } from "@/lib/demo/server";
import type { TFunction } from "i18next";

/** Thrown inside a step when the visitor leaves it, to unwind the animation quietly. */
export class Cancelled extends Error {}

/** Shared between the stage and one running step. */
export interface Token {
  cancelled: boolean;
  /** "Skip animation": finish the step now, without gliding or typing. */
  fast: boolean;
}

export interface Dock {
  tv: boolean;
  phone: boolean;
}

export interface Frames {
  tv: HTMLIFrameElement | null;
  phone: HTMLIFrameElement | null;
}

/**
 * What a step script can do. Targets are CSS selectors on the host console, or
 * `tv:<selector>` / `phone:<selector>` for something inside a device frame, or `@tv` / `@phone` for the device itself.
 */
export interface StepApi {
  t: TFunction;
  server: DemoServer;
  wait: (ms: number) => Promise<void>;
  caption: (text: string | null) => void;
  /** Dim everything except these targets (up to three). No arguments clears it. */
  highlight: (...targets: string[]) => void;
  click: (target: string) => Promise<void>;
  type: (target: string, text: string) => Promise<void>;
  select: (target: string, value: string) => Promise<void>;
  /** Press a keyboard key as the host would (used for the 1-8 answer shortcuts). */
  key: (key: string) => void;
  /** Move the cursor to a target without clicking. */
  point: (target: string) => Promise<void>;
  waitFor: (target: string) => Promise<Element>;
  showDevices: (devices: Partial<Dock>) => void;
}

interface Deps {
  token: Token;
  frames: () => Frames;
  overlay: () => OverlayHandle | null;
  server: DemoServer;
  t: TFunction;
  setCaption: (text: string | null) => void;
  setDock: (update: Partial<Dock>) => void;
}

interface Located {
  el: Element;
  rect: () => DOMRect;
}

/** Find a target and report where it is on the real screen, even inside a scaled device frame. */
export function locate(target: string, frames: Frames): Located | null {
  const match = /^(tv|phone):(.*)$/.exec(target);
  if (target === "@tv" || target === "@phone") {
    const el = document.querySelector(`[data-demo-device="${target.slice(1)}"]`);
    return el ? { el, rect: () => el.getBoundingClientRect() } : null;
  }
  if (match) {
    const frame = frames[match[1] as "tv" | "phone"];
    const doc = frame?.contentDocument;
    const el = doc?.querySelector(match[2]);
    if (!frame || !el) return null;
    return {
      el,
      rect: () => {
        const outer = frame.getBoundingClientRect();
        const scale = frame.clientWidth > 0 ? outer.width / frame.clientWidth : 1;
        const r = el.getBoundingClientRect();
        return new DOMRect(outer.left + r.left * scale, outer.top + r.top * scale, r.width * scale, r.height * scale);
      },
    };
  }
  const el = document.querySelector(target);
  return el ? { el, rect: () => el.getBoundingClientRect() } : null;
}

function setNativeValue(el: HTMLInputElement | HTMLSelectElement, value: string) {
  const win = el.ownerDocument.defaultView as (Window & typeof globalThis) | null;
  const proto = el instanceof (win?.HTMLSelectElement ?? HTMLSelectElement) ? "HTMLSelectElement" : "HTMLInputElement";
  const setter = Object.getOwnPropertyDescriptor((win ?? window)[proto].prototype, "value")?.set;
  setter?.call(el, value);
}

export function createStepApi(deps: Deps): StepApi {
  const { token, server, t } = deps;

  const check = () => {
    if (token.cancelled) throw new Cancelled();
  };

  const wait = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      setTimeout(
        () => {
          if (token.cancelled) reject(new Cancelled());
          else resolve();
        },
        token.fast ? 16 : ms
      );
    });

  const waitFor = async (target: string, timeout = 6000): Promise<Element> => {
    const start = Date.now();
    for (;;) {
      check();
      const found = locate(target, deps.frames());
      if (found && found.rect().width > 0) return found.el;
      if (Date.now() - start > timeout) throw new Error(`Demo target not found: ${target}`);
      await new Promise((r) => setTimeout(r, 50));
    }
  };

  const point = async (target: string) => {
    const el = await waitFor(target);
    if (!target.startsWith("tv:") && !target.startsWith("phone:") && el instanceof HTMLElement) {
      el.scrollIntoView({ block: "center", behavior: token.fast ? "auto" : "smooth" });
      await wait(token.fast ? 0 : 350);
    }
    deps.overlay()?.setInstant(token.fast);
    deps.overlay()?.setPointer(() => {
      const found = locate(target, deps.frames());
      if (!found) return null;
      const r = found.rect();
      return { x: r.left + Math.min(r.width / 2, 120), y: r.top + r.height / 2 };
    });
    await wait(750);
  };

  return {
    t,
    server,
    wait,
    caption: (text) => deps.setCaption(text),
    waitFor: (target) => waitFor(target),
    point,
    highlight: (...targets) => {
      deps.overlay()?.setInstant(token.fast);
      deps.overlay()?.setHighlights(
        targets.map((target) => () => {
          const found = locate(target, deps.frames());
          return found ? found.rect() : null;
        })
      );
    },
    async click(target) {
      await point(target);
      const el = await waitFor(target);
      deps.overlay()?.ripple();
      await wait(180);
      (el as HTMLElement).click();
      await wait(350);
    },
    async type(target, text) {
      await point(target);
      const el = (await waitFor(target)) as HTMLInputElement;
      el.focus();
      setNativeValue(el, "");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      if (token.fast) {
        setNativeValue(el, text);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } else {
        for (let i = 1; i <= text.length; i++) {
          setNativeValue(el, text.slice(0, i));
          el.dispatchEvent(new Event("input", { bubbles: true }));
          await wait(70);
        }
      }
      // The console debounces text fields by 400ms; never shorten this, or a checkpoint is taken before the value is sent.
      await new Promise((resolve) => setTimeout(resolve, 450));
      if (token.cancelled) throw new Cancelled();
      el.blur();
    },
    async select(target, value) {
      await point(target);
      const el = (await waitFor(target)) as HTMLSelectElement;
      deps.overlay()?.ripple();
      await wait(250);
      setNativeValue(el, value);
      el.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(500);
    },
    key(key) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    },
    showDevices: (devices) => deps.setDock(devices),
  };
}
