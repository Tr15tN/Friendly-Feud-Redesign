import { describe, expect, it } from "vitest";
import type { Game } from "../../types/game";
import { DemoServer, type LoadedGame } from "./server";

const SET: LoadedGame = {
  rounds: [
    {
      question: "Q1",
      answers: [
        { ans: "A", pnt: 40 },
        { ans: "B", pnt: 20 },
      ],
    },
    { question: "Q2", answers: [{ ans: "C", pnt: 10 }] },
  ],
  final_round: [{ question: "F1", answers: [["X", 30]] }],
  final_round_timers: [20, 25],
};

function setup() {
  let time = 1000;
  const server = new DemoServer({
    room: "DEMO",
    hostId: "host",
    files: () => ["games/en/normal/demo.json"],
    loadFile: (file) => (file === "games/en/normal/demo.json" ? SET : null),
    teamNames: ["Reds", "Blues"],
    now: () => (time += 10),
  });
  const host = server.connect("host");
  const messages: Record<string, unknown>[] = [];
  host.addEventListener("message", (e) => messages.push(JSON.parse(e.data)));
  const send = (event: Record<string, unknown>) => host.send(JSON.stringify(event));
  return { server, host, messages, send };
}

describe("DemoServer", () => {
  it("starts on the title screen with no game loaded", () => {
    const { server } = setup();
    expect(server.game.title).toBe(true);
    expect(server.game.rounds).toBeUndefined();
    expect(server.game.teams.map((t) => t.name)).toEqual(["Reds", "Blues"]);
  });

  it("offers the question sets when the language is set", () => {
    const { messages, send } = setup();
    send({ action: "change_lang", data: "en" });
    expect(messages[0]).toMatchObject({ action: "change_lang", games: ["games/en/normal/demo.json"] });
  });

  it("loads a built-in set with fresh round state", () => {
    const { server, messages, send } = setup();
    send({ action: "load_game", file: "games/en/normal/demo.json" });
    expect(server.game.rounds).toHaveLength(2);
    expect(server.game.rounds[0].answers[0]).toEqual({ ans: "A", pnt: 40, trig: false });
    expect(server.game.point_tracker).toEqual([0, 0]);
    expect(server.game.final_round_2).toHaveLength(1);
    expect(messages.at(-1)).toMatchObject({ action: "data" });
  });

  it("ignores unknown files", () => {
    const { server, send } = setup();
    send({ action: "load_game", file: "games/../../etc/passwd" });
    expect(server.game.rounds).toBeUndefined();
  });

  it("registers players on a team and orders buzzes by time", () => {
    const { server } = setup();
    const a = server.addPlayer("Anna");
    const b = server.addPlayer("Mart");
    const pa = server.connect(a);
    pa.send(JSON.stringify({ action: "registerbuzz", team: 0 }));
    server.connect(b).send(JSON.stringify({ action: "registerbuzz", team: 1 }));
    expect(server.game.registeredPlayers[a].team).toBe(0);
    server.playerBuzz(b);
    server.playerBuzz(a);
    server.playerBuzz(a);
    expect(server.game.buzzed.map((x) => x.id)).toEqual([b, a]);
  });

  it("keeps only the first physical-buzzer press until the host resolves it", () => {
    const { server, send } = setup();
    server.padBuzz();
    server.padBuzz();
    expect(server.game.buzzed).toHaveLength(1);
    expect(server.game.buzzed[0].team).toBeNull();
    send({ action: "resolve_buzz", team: 1 });
    expect(server.game.buzzed[0].team).toBe(1);
    send({ action: "resolve_buzz", team: 0 });
    expect(server.game.buzzed[0].team).toBe(1);
  });

  it("clears buzzers when the host changes round, and not otherwise", () => {
    const { server, send } = setup();
    send({ action: "load_game", file: "games/en/normal/demo.json" });
    const next = server.snapshot();
    next.title = false;
    send({ action: "data", data: next });
    server.padBuzz();
    const sameRound: Game = { ...server.snapshot(), teams: [{ name: "X", points: 5, mistakes: 0 }, server.game.teams[1]] };
    send({ action: "data", data: sameRound });
    expect(server.game.buzzed).toHaveLength(1);
    expect(server.game.teams[0].points).toBe(5);
    send({ action: "data", data: { ...sameRound, round: 1 } });
    expect(server.game.buzzed).toHaveLength(0);
  });

  it("relays sound and strike events to every page without credentials", () => {
    const { server, messages, send } = setup();
    const tv = server.connect("tv");
    const seen: Record<string, unknown>[] = [];
    tv.addEventListener("message", (e) => seen.push(JSON.parse(e.data)));
    send({ action: "show_mistake", data: 2, room: "DEMO", hostPassword: "secret", id: "host" });
    expect(seen).toEqual([{ action: "show_mistake", data: 2 }]);
    expect(messages.at(-1)).toEqual({ action: "show_mistake", data: 2 });
  });

  it("can restore an earlier state", () => {
    const { server, send } = setup();
    send({ action: "load_game", file: "games/en/normal/demo.json" });
    const saved = server.snapshot();
    server.addPlayer("Liis", 1);
    server.restore(saved);
    expect(Object.keys(server.game.registeredPlayers)).toHaveLength(0);
  });

  it("gives replayed players the same ids after a restore", () => {
    const { server } = setup();
    const before = server.snapshot();
    const first = server.addPlayer("Anna", 0);
    server.restore(before);
    expect(server.addPlayer("Anna", 0)).toBe(first);
  });

  it("removes a player who quits", () => {
    const { server, send } = setup();
    const id = server.addPlayer("Jaan", 0);
    send({ action: "quit", host: false, id });
    expect(server.game.registeredPlayers[id]).toBeUndefined();
  });
});
