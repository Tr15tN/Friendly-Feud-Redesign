import { describe, expect, it } from "vitest";
import type { FinalRound, Game } from "../../types/game";
import {
  addStrike,
  adjustTeamPoints,
  awardFinalAnswer,
  awardRound,
  finalRoundTotal,
  finalRoundWinThreshold,
  finalSelectionIndex,
  hasProgress,
  isFinalRoundWin,
  removeStrike,
  restoreScoringState,
  roundPot,
  sanitizeMultiplier,
  setMultiplier,
  stealTeam,
  syncPointTracker,
  toggleAnswer,
} from "./index";

function makeGame(): Game {
  return {
    room: "TEST",
    registeredPlayers: {},
    host: { id: "h" },
    buzzed: [],
    settings: {
      logo_url: null,
      title_music_url: null,
      hide_questions: false,
      theme: "default",
      final_round_title: null,
      player_buzzer_sound: false,
      first_buzzer_sound_only: false,
      hide_join_info: false,
      physical_buzzer: false,
    },
    teams: [
      { name: "Alpha", points: 0, mistakes: 0 },
      { name: "Bravo", points: 0, mistakes: 0 },
    ],
    title: false,
    title_text: "",
    point_tracker: [0, 0],
    round: 0,
    rounds: [
      {
        question: "q1",
        multiply: 1,
        answers: [
          { ans: "a", pnt: 43, trig: false },
          { ans: "b", pnt: 20, trig: false },
          { ans: "c", pnt: 13, trig: false },
        ],
      },
      { question: "q2", multiply: 2, answers: [{ ans: "x", pnt: 10, trig: false }] },
    ],
    is_final_round: false,
    is_final_second: false,
    hide_first_round: false,
    final_round: [],
    final_round_2: [],
    final_round_timers: [20, 25],
    tick: 0,
    round_start_time: 0,
  };
}

describe("sanitizeMultiplier", () => {
  it.each([
    ["", 1],
    ["abc", 1],
    [NaN, 1],
    [0, 1],
    [-3, 1],
    ["2", 2],
    [3.7, 3],
    [undefined, 1],
  ])("%p -> %p", (input, expected) => {
    expect(sanitizeMultiplier(input)).toBe(expected);
  });
});

describe("round pot", () => {
  it("is derived from revealed answers and the multiplier", () => {
    let g = toggleAnswer(makeGame(), 0).game;
    expect(g.point_tracker[0]).toBe(43);
    g = setMultiplier(g, "2");
    expect(g.point_tracker[0]).toBe(86); // bug #1: used to stay at 43
    g = toggleAnswer(g, 0).game;
    expect(g.point_tracker[0]).toBe(0); // used to go to -43 and clamp
  });

  it("ignores an empty multiplier instead of producing NaN", () => {
    let g = setMultiplier(makeGame(), "");
    g = toggleAnswer(g, 1).game;
    expect(g.rounds[0].multiply).toBe(1);
    expect(g.point_tracker[0]).toBe(20);
  });

  it("does not mutate its input", () => {
    const g = makeGame();
    toggleAnswer(g, 0);
    expect(g.rounds[0].answers[0].trig).toBe(false);
  });

  it("syncPointTracker repairs stale values", () => {
    const g = makeGame();
    g.rounds[0].answers[0].trig = true;
    g.point_tracker = [-5, 99];
    expect(syncPointTracker(g).point_tracker).toEqual([43, 0]);
  });
});

describe("awarding", () => {
  it("banks the pot once and locks it for clean-up reveals", () => {
    let g = toggleAnswer(makeGame(), 0).game;
    g = toggleAnswer(g, 1).game;
    g = awardRound(g, 0);
    expect(g.teams[0].points).toBe(63);
    expect(g.rounds[0].awarded_to).toBe(0);
    expect(g.rounds[0].awarded_points).toBe(63);

    // second award (same or other team) is a no-op -> no double scoring
    expect(awardRound(g, 0)).toBe(g);
    expect(awardRound(g, 1).teams[1].points).toBe(0);

    // leftover reveal is marked clean-up and doesn't change the pot or totals
    const after = toggleAnswer(g, 2);
    expect(after.revealed).toBe(true);
    expect(after.game.rounds[0].answers[2].cleanup).toBe(true);
    expect(roundPot(after.game.rounds[0])).toBe(63);
    expect(after.game.teams[0].points).toBe(63);
  });

  it("multiplier changes after awarding don't change the banked pot", () => {
    let g = awardRound(toggleAnswer(makeGame(), 0).game, 1);
    g = setMultiplier(g, 3);
    expect(g.point_tracker[0]).toBe(43);
    expect(g.teams[1].points).toBe(43);
  });

  it("each round is awarded independently", () => {
    let g = awardRound(toggleAnswer(makeGame(), 0).game, 0);
    g = { ...g, round: 1 };
    g = awardRound(toggleAnswer(g, 0).game, 0);
    expect(g.teams[0].points).toBe(43 + 20);
    expect(g.point_tracker).toEqual([43, 20]);
  });
});

describe("strikes, adjustments and steal", () => {
  it("clamps strikes to 0..3", () => {
    let g = makeGame();
    for (let i = 0; i < 5; i++) g = addStrike(g, 1);
    expect(g.teams[1].mistakes).toBe(3);
    expect(stealTeam(g)).toBe(0);
    for (let i = 0; i < 5; i++) g = removeStrike(g, 1);
    expect(g.teams[1].mistakes).toBe(0);
    expect(stealTeam(g)).toBeNull();
  });

  it("manual adjust never goes negative", () => {
    let g = adjustTeamPoints(makeGame(), 0, 10);
    expect(g.teams[0].points).toBe(10);
    g = adjustTeamPoints(g, 0, -25);
    expect(g.teams[0].points).toBe(0);
    expect(adjustTeamPoints(g, 0, NaN)).toBe(g);
  });

  it("hasProgress detects a game in progress", () => {
    expect(hasProgress(makeGame())).toBe(false);
    expect(hasProgress(toggleAnswer(makeGame(), 0).game)).toBe(true);
    expect(hasProgress(addStrike(makeGame(), 0))).toBe(true);
  });
});

describe("fast money", () => {
  const fr = (answers: [string, number][]): FinalRound => ({
    answers: answers.map(([a, p]) => ({ 0: a, 1: p })),
    question: "q",
    selection: 0,
    points: 0,
    input: "",
    revealed: false,
  });

  it("awards points by selection and supports 'no answer'", () => {
    const r = fr([
      ["Nose", 52],
      ["Neck", 20],
    ]);
    expect(awardFinalAnswer(r, 1)).toMatchObject({ points: 52, selection: 1, awarded: true });
    expect(awardFinalAnswer(r, 2).points).toBe(20);
    expect(awardFinalAnswer(r, 0)).toMatchObject({ points: 0, selection: 0, awarded: true });
  });

  it("decodes the pending (negative) selection encoding", () => {
    expect(finalSelectionIndex({ ...fr([]), selection: -3 })).toBe(2);
    expect(finalSelectionIndex({ ...fr([]), selection: 2 })).toBe(2);
  });

  it("uses a configurable win threshold", () => {
    const g = makeGame();
    g.final_round = [{ ...fr([]), points: 120 }];
    g.final_round_2 = [{ ...fr([]), points: 60 }];
    expect(finalRoundTotal(g)).toBe(180);
    expect(finalRoundWinThreshold(g)).toBe(200);
    expect(isFinalRoundWin(g)).toBe(false);
    g.settings.final_round_win_threshold = 150;
    expect(isFinalRoundWin(g)).toBe(true);
    g.settings.final_round_win_threshold = 0;
    expect(finalRoundWinThreshold(g)).toBe(200);
  });
});

describe("restoreScoringState (undo)", () => {
  it("restores scores/reveals but keeps names, players and settings from now", () => {
    const before = toggleAnswer(makeGame(), 0).game;
    let now = awardRound(before, 0);
    now = addStrike(now, 1);
    now.teams[0].name = "Renamed";
    now.settings.theme = "darkTheme";
    now.registeredPlayers = {
      p1: { name: "P", team: 0, hidden: false, latency: 0, latencies: [], start: new Date(0) },
    };

    const restored = restoreScoringState(now, before);
    expect(restored.teams[0].points).toBe(0);
    expect(restored.teams[1].mistakes).toBe(0);
    expect(restored.rounds[0].awarded_to).toBeUndefined();
    expect(restored.point_tracker[0]).toBe(43);
    expect(restored.teams[0].name).toBe("Renamed");
    expect(restored.settings.theme).toBe("darkTheme");
    expect(Object.keys(restored.registeredPlayers)).toEqual(["p1"]);
  });
});
