import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

interface MainRound {
  question: string;
  answers: { ans: string; pnt: number }[];
  multiply: number;
}
interface FinalQuestion {
  question: string;
  answers: [string, number][];
}

/** The question set made for the Rooside Sõda event: every question has 6 answers worth exactly 100 points. */
const game = JSON.parse(readFileSync("games/et/rooside/rooside_sõda_keila_kool.json", "utf8")) as {
  rounds: MainRound[];
  final_round: FinalQuestion[];
  final_round_timers: number[];
};

const highestFirst = (points: number[]) => expect(points).toEqual([...points].sort((a, b) => b - a));

describe("Rooside Sõda · Keila Kool question set", () => {
  it("has 8 rounds and 5 Fast Money questions", () => {
    expect(game.rounds).toHaveLength(8);
    expect(game.final_round).toHaveLength(5);
    expect(game.final_round_timers).toEqual([20, 25]);
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

  game.final_round.forEach((question, i) => {
    it(`Fast Money question ${i + 1} has 6 answers worth 100, highest first`, () => {
      expect(question.answers).toHaveLength(6);
      expect(question.answers.reduce((sum, [, pts]) => sum + pts, 0)).toBe(100);
      highestFirst(question.answers.map(([, pts]) => pts));
      for (const [ans] of question.answers) expect(ans.trim()).toBe(ans);
    });
  });
});
