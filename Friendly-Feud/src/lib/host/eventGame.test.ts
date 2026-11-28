import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

interface MainRound {
  question: string;
  answers: { ans: string; pnt: number }[];
  multiply: number;
}
/** The question set made for the Rooside Sõda event: every question has 6 answers worth exactly 100 points. */
const game = JSON.parse(readFileSync("games/et/rooside/rooside_sõda_keila_kool.json", "utf8")) as {
  rounds: MainRound[];
  final_round: unknown[];
  final_round_timers: number[];
};

const highestFirst = (points: number[]) => expect(points).toEqual([...points].sort((a, b) => b - a));

describe("Rooside Sõda · Keila Kool question set", () => {
  it("has 8 rounds and skips Fast Money", () => {
    expect(game.rounds).toHaveLength(8);
    expect(game.final_round).toEqual([]);
    expect(game.final_round_timers).toEqual([20, 25]);
  });

  it("asks the questions in the event running order", () => {
    expect(game.rounds.map((r) => r.question)).toEqual([
      "Nimeta lemmik õppeaine.",
      "Nimeta hea vabandus, millega põhjendasid kodutöö tegemata jätmist.",
      "Nimeta kuulus Keila Kooli vilistlane.",
      "Nimeta kõige rangem koolireegel.",
      "Nimeta meeldejäävaim sündmus koolis.",
      "Nimeta üks Keila Kooli direktor.",
      "Nimeta lemmik magustoit koolis.",
      "Nimeta Keila Kooli legendaarseim õpetaja.",
    ]);
  });

  game.rounds.forEach((round, i) => {
    it(`round ${i + 1} has 6 answers worth 100, highest first, no multiplier`, () => {
      expect(round.question.trim()).toBe(round.question);
      expect(round.answers).toHaveLength(6);
      expect(round.answers.reduce((sum, a) => sum + a.pnt, 0)).toBe(100);
      highestFirst(round.answers.map((a) => a.pnt));
      expect(round.multiply).toBe(1);
      for (const a of round.answers) expect(a.ans.trim()).toBe(a.ans);
    });
  });
});
