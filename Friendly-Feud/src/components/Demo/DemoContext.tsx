import { createContext, useContext } from "react";

/** Present only inside the interactive demo. Real pages see `null` and behave normally. */
export interface DemoApi {
  /** The "Open Game Window" button: in the demo the TV is already on screen, so just point at it. */
  onOpenGameWindow: () => void;
  /** Leave the demo (the console's Quit button). */
  exit: () => void;
}

export const DemoContext = createContext<DemoApi | null>(null);

export function useDemo(): DemoApi | null {
  return useContext(DemoContext);
}
