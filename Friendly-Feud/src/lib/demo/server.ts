// A tiny in-browser stand-in for the Go backend, used by the interactive demo.
// It speaks the same JSON messages as the real WebSocket, so the real host console, TV board and
// player pages run unchanged against it. Nothing here touches the network.
// Relative imports only: Vitest runs this file without the Next.js path aliases.
import type { Game, Round, FinalRound } from "../../types/game";

type Json = Record<string, unknown>;
type Listener = (evt: { data: string }) => void;

/** The part of a question-set file the server needs. */
export interface LoadedGame {
  rounds: { question: string; answers: { ans: string; pnt: number }[] }[];
  final_round: { question: string; answers: [string, number][] }[];
  final_round_timers: number[];
}

export interface DemoServerOptions {
  room: string;
  hostId: string;
  /** Files offered in the host's question-set picker, for the language the host picked. */
  files: (language: string) => string[];
  loadFile: (file: string) => LoadedGame | null;
  teamNames: [string, string];
  now?: () => number;
}

/** What a connected page sees: the subset of WebSocket the app uses. */
export class DemoClient {
  readyState = 1;
  private listeners = new Set<Listener>();

  constructor(
    private server: DemoServer,
    readonly id: string
  ) {}

  send(raw: string) {
    this.server.receive(this, JSON.parse(raw) as Json);
  }

  addEventListener(type: string, fn: Listener) {
    if (type === "message") this.listeners.add(fn);
  }

  removeEventListener(type: string, fn: Listener) {
    if (type === "message") this.listeners.delete(fn);
  }

  close() {
    this.readyState = 3;
    this.listeners.clear();
    this.server.disconnect(this);
  }

  /** Deliver a message to this page, as the server would. */
  deliver(message: Json) {
    const data = JSON.stringify(message);
    this.listeners.forEach((fn) => fn({ data }));
  }
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function freshRound(r: LoadedGame["rounds"][number]): Round {
  return {
    question: r.question,
    multiply: 1,
    answers: r.answers.map((a) => ({ ans: a.ans, pnt: a.pnt, trig: false })),
    awarded_to: null,
    awarded_points: 0,
  };
}

function freshFinal(f: LoadedGame["final_round"][number]): FinalRound {
  return { question: f.question, answers: f.answers, selection: 0, points: 0, input: "", revealed: false };
}

export class DemoServer {
  game: Game;
  private clients = new Set<DemoClient>();
  private nextPlayer = 1;
  private now: () => number;

  constructor(private options: DemoServerOptions) {
    this.now = options.now ?? (() => Date.now());
    const t = this.now();
    this.game = {
      room: options.room,
      registeredPlayers: {},
      host: { id: options.hostId },
      buzzed: [],
      settings: {
        logo_url: null,
        title_music_url: null,
        hide_questions: true,
        theme: "default",
        final_round_title: null,
        player_buzzer_sound: false,
        first_buzzer_sound_only: false,
        hide_join_info: false,
      },
      teams: [
        { name: options.teamNames[0], points: 0, mistakes: 0 },
        { name: options.teamNames[1], points: 0, mistakes: 0 },
      ],
      title: true,
      title_text: "",
      point_tracker: [],
      round: 0,
      rounds: undefined as unknown as Round[],
      is_final_round: false,
      is_final_second: false,
      hide_first_round: false,
      final_round: undefined as unknown as FinalRound[],
      final_round_2: undefined as unknown as FinalRound[],
      final_round_timers: [20, 25],
      tick: t,
      round_start_time: t,
    };
  }

  connect(id: string): DemoClient {
    const client = new DemoClient(this, id);
    this.clients.add(client);
    return client;
  }

  disconnect(client: DemoClient) {
    this.clients.delete(client);
  }

  /** Full state for pages that join late. */
  snapshot(): Game {
    return clone(this.game);
  }

  restore(snapshot: Game) {
    this.game = clone(snapshot);
    // Players added again after a restore get the same ids as the first time round.
    const used = Object.keys(this.game.registeredPlayers)
      .map((id) => Number(id.replace("demo-player-", "")))
      .filter((n) => Number.isFinite(n));
    this.nextPlayer = Math.max(0, ...used) + 1;
    this.broadcast({ action: "clearbuzzers" });
    this.broadcastData();
  }

  private broadcast(message: Json) {
    this.clients.forEach((c) => c.deliver(message));
  }

  broadcastData() {
    this.broadcast({ action: "data", data: clone(this.game) });
  }

  /** A player joins from their phone. Returns the new player id. */
  addPlayer(name: string, team: number | null = null): string {
    const id = `demo-player-${this.nextPlayer++}`;
    this.game.registeredPlayers[id] = {
      start: new Date(this.now()),
      latencies: [],
      team,
      latency: 0,
      name,
      hidden: false,
    };
    this.broadcastData();
    return id;
  }

  /** A player presses the buzzer on their phone. The earliest press stays first. */
  playerBuzz(id: string) {
    if (!this.game.registeredPlayers[id] || this.game.buzzed.some((b) => b.id === id)) return;
    this.game.buzzed.push({ id, time: this.now(), team: null });
    this.game.buzzed.sort((a, b) => a.time - b.time);
    this.clients.forEach((c) => c.id === id && c.deliver({ action: "buzzed" }));
    this.broadcastData();
  }

  /** The single physical buzzer. Only the first press counts; the host says who was first. */
  padBuzz(team: number | null = null) {
    if (team === null) {
      if (this.game.buzzed.length > 0) return;
      this.game.buzzed.push({ id: "", time: this.now(), team: null });
    } else if (!this.game.buzzed.some((b) => b.team === team)) {
      this.game.buzzed.push({ id: "", time: this.now(), team });
    }
    this.broadcast({ action: "buzzed" });
    this.broadcastData();
  }

  receive(client: DemoClient, event: Json) {
    const action = event.action as string;
    switch (action) {
      case "change_lang":
        client.deliver({
          action: "change_lang",
          data: event.data,
          games: this.options.files(typeof event.data === "string" ? event.data : "en"),
        });
        return;
      case "load_game":
        this.loadGame(event);
        return;
      case "data":
        this.mergeData(event.data as Game);
        return;
      case "registerbuzz": {
        const player = this.game.registeredPlayers[client.id];
        if (!player) return;
        player.team = typeof event.team === "number" ? event.team : null;
        client.deliver({ action: "registered" });
        this.broadcastData();
        return;
      }
      case "buzz":
        this.playerBuzz(client.id);
        return;
      case "buzzer_screen_buzz":
        this.padBuzz(typeof event.team === "number" ? event.team : null);
        return;
      case "resolve_buzz": {
        const first = this.game.buzzed[0];
        const team = event.team;
        if (first && first.id === "" && first.team == null && (team === 0 || team === 1)) {
          first.team = team;
          this.broadcastData();
        }
        return;
      }
      case "clearbuzzers":
        this.game.buzzed = [];
        this.broadcast({ action: "clearbuzzers" });
        this.broadcastData();
        return;
      case "quit":
        if (typeof event.id === "string" && event.host !== true) {
          delete this.game.registeredPlayers[event.id];
          this.game.buzzed = this.game.buzzed.filter((b) => b.id !== event.id);
          this.broadcastData();
        }
        return;
      case "pong":
      case "registerspectator":
      case "register_buzzer_screen":
      case "logo_upload":
      case "del_logo_upload":
      case "title_music_upload":
      case "del_title_music_upload":
        return;
      default: {
        // Sounds, strike flashes and timers are relayed to every page as they are.
        const { room: _room, id: _id, hostPassword: _pw, ...rest } = event;
        this.broadcast(rest);
      }
    }
  }

  private loadGame(event: Json) {
    const loaded =
      typeof event.file === "string"
        ? this.options.loadFile(event.file)
        : ((event.data as LoadedGame | undefined) ?? null);
    if (!loaded || !loaded.rounds?.length) return;
    this.game.rounds = loaded.rounds.map(freshRound);
    this.game.final_round = (loaded.final_round ?? []).map(freshFinal);
    this.game.final_round_2 = (loaded.final_round ?? []).map(freshFinal);
    this.game.final_round_timers = loaded.final_round_timers ?? [20, 25];
    this.game.point_tracker = this.game.rounds.map(() => 0);
    this.broadcastData();
  }

  /** Same fields the real server accepts from the host. Changing round or screen clears the buzzers. */
  private mergeData(next: Game) {
    const g = this.game;
    const roundOrScreenChanged = g.round !== next.round || g.title !== next.title;
    g.round = next.round;
    g.rounds = next.rounds;
    g.final_round = next.final_round;
    g.final_round_2 = next.final_round_2;
    g.hide_first_round = next.hide_first_round;
    g.is_final_round = next.is_final_round;
    g.is_final_second = next.is_final_second;
    g.point_tracker = next.point_tracker;
    g.settings = next.settings;
    g.teams = next.teams;
    g.title = next.title;
    g.title_text = next.title_text;
    g.registeredPlayers = next.registeredPlayers;
    g.tick = this.now();
    if (roundOrScreenChanged) {
      g.buzzed = [];
      g.round_start_time = this.now();
      this.broadcast({ action: "clearbuzzers" });
    }
    this.broadcastData();
  }
}
