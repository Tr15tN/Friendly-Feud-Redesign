import type { DemoServer } from "./server";

declare global {
  interface Window {
    /** Set by the demo page. The TV and phone frames (same-origin iframes) find it on their parent. */
    famfDemoServer?: DemoServer;
  }
}

export function getDemoServer(): DemoServer | null {
  try {
    return window.famfDemoServer ?? window.parent?.famfDemoServer ?? null;
  } catch {
    return null;
  }
}
