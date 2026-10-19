import { describe, expect, it } from "vitest";
import type { Game } from "../../types/game";
import { currentPhase, firstBuzz, gotoFinal, gotoRound, gotoTitle, roundDots, teamColumnState } from "./console";

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
    },
    teams: [
      { name: "Alpha", points: 0, mistakes: 0 },
      { name: "Bravo", points: 0, mistakes: 0 },
    ],
    title: false,
    title_text: "",
    point_tracker: [0, 0, 0],
    round: 0,
    rounds: [
      {
        question: "q1",
        multiply: 1,
        answers: [
          { trig: false, ans: "a", pnt: 40 },
          { trig: false, ans: "b", pnt: 10 },
        ],
      },
      { question: "q2", multiply: 2, answers: [{ trig: false, ans: "c", pnt: 5 }] },
      { question: "q3", multiply: 1, answers: [{ trig: false, ans: "d", pnt: 5 }] },
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

describe("currentPhase", () => {
  it("is lobby on the title screen", () => {
    const g = makeGame();
    g.title = true;
    expect(currentPhase(g)).toBe("lobby");
  });

  it("is fastmoney in the final round", () => {
    const g = makeGame();
    g.is_final_round = true;
    expect(currentPhase(g)).toBe("fastmoney");
  });

  it("is rounds otherwise", () => {
    expect(currentPhase(makeGame())).toBe("rounds");
  });

  it("prefers lobby over fastmoney when both flags are set", () => {
    const g = makeGame();
    g.title = true;
    g.is_final_round = true;
    expect(currentPhase(g)).toBe("lobby");
  });
});

describe("teamColumnState", () => {
  it("reports score, strikes and the live pot", () => {
    const g = makeGame();
    g.teams[0].points = 120;
    g.teams[0].mistakes = 2;
    g.rounds[0].answers[0].trig = true;
    expect(teamColumnState(g, 0)).toMatchObject({
      team: 0,
      name: "Alpha",
      points: 120,
      strikes: 2,
      maxStrikes: 3,
      pot: 40,
      roundAwarded: false,
      banked: false,
      bankedPoints: 0,
      inControl: false,
      canBank: true,
    });
  });

  it("shows the banking team and locks banking for both teams", () => {
    const g = makeGame();
    g.rounds[0].answers[0].trig = true;
    g.rounds[0].awarded_to = 1;
    g.rounds[0].awarded_points = 40;
    expect(teamColumnState(g, 1)).toMatchObject({
      banked: true,
      bankedPoints: 40,
      roundAwarded: true,
      canBank: false,
    });
    expect(teamColumnState(g, 0)).toMatchObject({ banked: false, bankedPoints: 0, roundAwarded: true, canBank: false });
  });

  it("marks the first buzzing team in control until the round is banked", () => {
    const g = makeGame();
    g.registeredPlayers.p1 = { start: new Date(), latencies: [], team: 1, latency: 0, name: "Sam", hidden: false };
    g.buzzed = [{ time: 1, id: "p1", team: 1 }];
    expect(teamColumnState(g, 1).inControl).toBe(true);
    expect(teamColumnState(g, 0).inControl).toBe(false);
    g.rounds[0].awarded_to = 0;
    g.rounds[0].awarded_points = 0;
    expect(teamColumnState(g, 1).inControl).toBe(false);
  });
});

describe("roundDots", () => {
  it("marks the current round and awarded rounds", () => {
    const g = makeGame();
    g.round = 1;
    g.rounds[0].awarded_to = 0;
    g.rounds[0].awarded_points = 10;
    expect(roundDots(g)).toEqual([
      { index: 0, current: false, awarded: true },
      { index: 1, current: true, awarded: false },
      { index: 2, current: false, awarded: false },
    ]);
  });
});

describe("firstBuzz", () => {
  it("returns nulls when nobody buzzed", () => {
    expect(firstBuzz(makeGame())).toEqual({ team: null, name: null });
  });

  it("returns the registered player's name and team", () => {
    const g = makeGame();
    g.registeredPlayers.p1 = { start: new Date(), latencies: [], team: 0, latency: 0, name: "Sam", hidden: false };
    g.buzzed = [{ time: 1, id: "p1", team: 0 }];
    expect(firstBuzz(g)).toEqual({ team: 0, name: "Sam" });
  });

  it("uses the team of a host-buzzer press that has no player id", () => {
    const g = makeGame();
    g.buzzed = [{ time: 1, id: "", team: 1 }];
    expect(firstBuzz(g)).toEqual({ team: 1, name: null });
  });
});

describe("flow transitions", () => {
  it("gotoRound clears title/final flags and strikes, and never mutates the input", () => {
    const g = makeGame();
    g.title = true;
    g.is_final_round = true;
    g.is_final_second = true;
    g.teams[0].mistakes = 2;
    g.teams[0].points = 50;
    const next = gotoRound(g, 2);
    expect(next.round).toBe(2);
    expect(next.title).toBe(false);
    expect(next.is_final_round).toBe(false);
    expect(next.is_final_second).toBe(false);
    expect(next.teams[0].mistakes).toBe(0);
    expect(next.teams[0].points).toBe(50);
    expect(g.round).toBe(0);
    expect(g.teams[0].mistakes).toBe(2);
    expect(g.title).toBe(true);
  });

  it("gotoRound clamps the index into the valid range", () => {
    expect(gotoRound(makeGame(), 99).round).toBe(2);
    expect(gotoRound(makeGame(), -4).round).toBe(0);
    expect(gotoRound(makeGame(), Number.NaN).round).toBe(0);
  });

  it("gotoTitle shows the title screen from round 0 and keeps scores", () => {
    const g = makeGame();
    g.round = 2;
    g.is_final_round = true;
    g.teams[1].points = 85;
    const next = gotoTitle(g);
    expect(next.title).toBe(true);
    expect(next.round).toBe(0);
    expect(next.is_final_round).toBe(false);
    expect(next.is_final_second).toBe(false);
    expect(next.teams[1].points).toBe(85);
    expect(g.title).toBe(false);
  });

  it("gotoFinal switches to the first fast-money half", () => {
    const g = makeGame();
    g.title = true;
    g.is_final_second = true;
    const next = gotoFinal(g);
    expect(next.title).toBe(false);
    expect(next.is_final_round).toBe(true);
    expect(next.is_final_second).toBe(false);
    expect(g.is_final_round).toBe(false);
  });
});
