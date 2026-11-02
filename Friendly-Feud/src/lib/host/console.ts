// Pure helpers behind the host console: view-models for the UI and the flow transitions.
// Relative imports only: Vitest runs this file without the Next.js path aliases.
import type { Game } from "../../types/game";
import { firstBuzzTeam, isAwarded, MAX_STRIKES, roundPot } from "../scoring";

export type Phase = "lobby" | "rounds" | "fastmoney";

export function currentPhase(game: Game): Phase {
  if (game.title) return "lobby";
  if (game.is_final_round) return "fastmoney";
  return "rounds";
}

export interface TeamColumnState {
  team: number;
  name: string;
  points: number;
  strikes: number;
  maxStrikes: number;
  /** Live pot of the current round (locked value once banked). */
  pot: number;
  roundAwarded: boolean;
  /** This team banked the current round. */
  banked: boolean;
  bankedPoints: number;
  /** This team buzzed first and the round has not been banked yet. */
  inControl: boolean;
  canBank: boolean;
}

export function teamColumnState(game: Game, team: number): TeamColumnState {
  const info = game.teams[team];
  const round = game.rounds?.[game.round];
  const awarded = isAwarded(round);
  const banked = round?.awarded_to === team;
  return {
    team,
    name: info?.name ?? "",
    points: info?.points ?? 0,
    strikes: info?.mistakes ?? 0,
    maxStrikes: MAX_STRIKES,
    pot: roundPot(round),
    roundAwarded: awarded,
    banked,
    bankedPoints: banked ? (round?.awarded_points ?? 0) : 0,
    inControl: !awarded && firstBuzzTeam(game) === team,
    canBank: !!round && !awarded,
  };
}

export interface RoundDot {
  index: number;
  current: boolean;
  awarded: boolean;
}

export function roundDots(game: Game): RoundDot[] {
  return (game.rounds ?? []).map((round, index) => ({
    index,
    current: index === game.round,
    awarded: isAwarded(round),
  }));
}

/** Who buzzed first this round: the team (if known) and the player's name (if a player buzzed). */
export function firstBuzz(game: Game): { team: number | null; name: string | null } {
  const first = game.buzzed?.[0];
  if (!first) return { team: null, name: null };
  const player = first.id ? game.registeredPlayers?.[first.id] : undefined;
  return { team: firstBuzzTeam(game), name: player?.name || null };
}

/** The first buzz came from the physical buzzer and the host has not said which team it was. */
export function hasPendingBuzz(game: Game): boolean {
  const first = game.buzzed?.[0];
  return !!first && !first.id && first.team == null;
}

/** Show a regular round: clears the title/final flags and both teams' strikes. */
export function gotoRound(game: Game, roundIndex: number): Game {
  const next = structuredClone(game);
  const last = Math.max(0, (next.rounds?.length ?? 1) - 1);
  next.title = false;
  next.is_final_round = false;
  next.is_final_second = false;
  next.round = Math.min(Math.max(0, Math.trunc(roundIndex) || 0), last);
  next.teams.forEach((team) => (team.mistakes = 0));
  return next;
}

/** Show the title screen (the lobby) from round 0. Scores are kept. */
export function gotoTitle(game: Game): Game {
  const next = structuredClone(game);
  next.title = true;
  next.round = 0;
  next.is_final_round = false;
  next.is_final_second = false;
  return next;
}

/** Switch to the first half of Fast Money. */
export function gotoFinal(game: Game): Game {
  const next = structuredClone(game);
  next.title = false;
  next.is_final_round = true;
  next.is_final_second = false;
  return next;
}
