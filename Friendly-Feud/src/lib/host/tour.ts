/** First-run walkthrough for new hosts. Texts are English i18n keys; the UI translates them. */

export interface TourStep {
  id: string;
  title: string;
  body: string;
}

export const HOST_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome, host",
    body: "You are running the show. This one-minute tour covers the essentials. You can replay it any time from the Help menu.",
  },
  {
    id: "game",
    title: "Load a game",
    body: "Pick a built-in question set or upload your own. Team names, logo and theme are in the same settings below it.",
  },
  {
    id: "join",
    title: "Share the room code",
    body: "Players open the site, type your 4-letter room code and a name, then pick a team on their phone. They show up in the lobby.",
  },
  {
    id: "board",
    title: "Put the board on the TV",
    body: "Click Open Game Window and move that tab to the TV or projector. This screen stays with you as the control panel.",
  },
  {
    id: "round",
    title: "Run a round",
    body: "Press Start Round 1. Click an answer (or press keys 1-8) to reveal it, add a strike for a wrong answer, then bank the points for the team that wins the round.",
  },
  {
    id: "buzzers",
    title: "Buzzers",
    body: "Players buzz from their phones. With a real buzzer, press Host Buzzers in the top bar, enter your host password and bind any key as the button.",
  },
  {
    id: "fastmoney",
    title: "Fast Money",
    body: "After the last round, use the Fast Money step at the top for the final round, with the timer and the reveal controls.",
  },
];

const STORAGE_KEY = "famf.hostTour";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** The tour starts by itself on a host's first visit. Automated browsers are skipped so tests are not blocked. */
export function shouldAutoStartTour(storage: StorageLike | null, automated: boolean): boolean {
  if (automated) return false;
  try {
    return storage?.getItem(STORAGE_KEY) !== "done";
  } catch {
    return false;
  }
}

export function markTourDone(storage: StorageLike | null): void {
  try {
    storage?.setItem(STORAGE_KEY, "done");
  } catch {
    // Private mode or storage disabled: the tour just shows again next time.
  }
}
