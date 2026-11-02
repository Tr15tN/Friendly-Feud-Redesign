// Content for the interactive demo: one small question set, written for the current language.
// Relative imports only: Vitest runs this file without the Next.js path aliases.
import type { LoadedGame } from "./server";

type Translate = (key: string) => string;

export const DEMO_ROOM = "DEMO";
export const DEMO_HOST_ID = "demo-host";
export const DEMO_PASSWORD = "demo";
/** Shown in the host's question-set picker, in the same folders the real sets use. */
export const demoFiles = (language: string): string[] =>
  language === "et" ? ["games/et/tavalised/demo.json"] : ["games/en/normal/demo.json"];

export function buildDemoSet(t: Translate): LoadedGame {
  const a = (text: string, pnt: number) => ({ ans: t(text), pnt });
  return {
    rounds: [
      {
        question: t("Name something you take to a picnic"),
        answers: [
          a("Sandwiches", 38),
          a("Drinks", 27),
          a("A blanket", 18),
          a("Fruit", 10),
          a("A frisbee", 7),
        ],
      },
      {
        question: t("Name a reason people are late for work"),
        answers: [a("Traffic", 45), a("Overslept", 30), a("Car trouble", 15), a("Bad weather", 10)],
      },
    ],
    final_round: [
      {
        question: t("Name a pet people keep at home"),
        answers: [
          [t("Dog"), 40],
          [t("Cat"), 33],
          [t("Fish"), 14],
          [t("Rabbit"), 8],
          [t("Hamster"), 5],
        ],
      },
      {
        question: t("Name a yellow fruit"),
        answers: [
          [t("Banana"), 55],
          [t("Lemon"), 25],
          [t("Pineapple"), 12],
          [t("Pear"), 5],
          [t("Melon"), 3],
        ],
      },
      {
        question: t("Name something to do on a sunny day"),
        answers: [
          [t("Go swimming"), 36],
          [t("Have a picnic"), 28],
          [t("Go for a walk"), 20],
          [t("Sunbathe"), 10],
          [t("Cycle"), 6],
        ],
      },
    ],
    final_round_timers: [20, 25],
  };
}
