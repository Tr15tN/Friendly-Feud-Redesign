// Pure scoring helpers shared by the host console and the boards.
// Every mutator returns a new Game; the input is never modified.
import type { FinalRound, Game, Round } from "../../types/game";

export const MAX_STRIKES = 3;
export const DEFAULT_FINAL_ROUND_WIN_THRESHOLD = 200;

const clone = <T>(value: T): T => structuredClone(value);

/** Coerce any multiplier input (string, NaN, 0, negatives, decimals) to an integer >= 1. */
export function sanitizeMultiplier(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function isAwarded(round: Round | undefined): boolean {
  return round?.awarded_to === 0 || round?.awarded_to === 1;
}

/** Points an answer contributes to the pot (base points x multiplier). */
export function answerValue(round: Round, points: number): number {
  return points * sanitizeMultiplier(round.multiply);
}

/** Live pot derived from revealed answers; locked to awarded_points once banked. */
export function roundPot(round: Round | undefined): number {
  if (!round) return 0;
  if (isAwarded(round)) return Math.max(0, round.awarded_points ?? 0);
  const base = round.answers.reduce((sum, a) => sum + (a.trig && !a.cleanup ? a.pnt || 0 : 0), 0);
  return base * sanitizeMultiplier(round.multiply);
}

/** Recompute point_tracker for every round from the round data (fixes stale/negative pots). */
export function syncPointTracker(game: Game): Game {
  const next = clone(game);
  next.point_tracker = (next.rounds ?? []).map((r) => roundPot(r));
  return next;
}

/** Toggle an answer on the board. Reveals after the round was awarded are clean-up only. */
export function toggleAnswer(game: Game, answerIndex: number): { game: Game; revealed: boolean } {
  const next = clone(game);
  const round = next.rounds[next.round];
  const answer = round?.answers[answerIndex];
  if (!answer) return { game, revealed: false };
  answer.trig = !answer.trig;
  answer.cleanup = answer.trig && isAwarded(round) ? true : undefined;
  if (answer.cleanup === undefined) delete answer.cleanup;
  return { game: syncPointTracker(next), revealed: answer.trig };
}

export function setMultiplier(game: Game, value: unknown): Game {
  const next = clone(game);
  const round = next.rounds[next.round];
  if (!round) return game;
  round.multiply = sanitizeMultiplier(value);
  return syncPointTracker(next);
}

/** Bank the current pot for a team. No-op if the round is already awarded. */
export function awardRound(game: Game, team: number): Game {
  const round = game.rounds?.[game.round];
  if (!round || isAwarded(round) || !game.teams[team]) return game;
  const pot = roundPot(round);
  const next = clone(game);
  const r = next.rounds[next.round];
  r.awarded_to = team;
  r.awarded_points = pot;
  next.teams[team].points += pot;
  return syncPointTracker(next);
}

export function addStrike(game: Game, team: number): Game {
  if (!game.teams[team]) return game;
  const next = clone(game);
  next.teams[team].mistakes = Math.min(MAX_STRIKES, (next.teams[team].mistakes || 0) + 1);
  return next;
}

export function removeStrike(game: Game, team: number): Game {
  if (!game.teams[team]) return game;
  const next = clone(game);
  next.teams[team].mistakes = Math.max(0, (next.teams[team].mistakes || 0) - 1);
  return next;
}

export function resetStrikes(game: Game): Game {
  const next = clone(game);
  next.teams.forEach((t) => (t.mistakes = 0));
  return next;
}

/** Manual correction of a team's total (never below 0). */
export function adjustTeamPoints(game: Game, team: number, delta: number): Game {
  if (!game.teams[team] || !Number.isFinite(delta)) return game;
  const next = clone(game);
  next.teams[team].points = Math.max(0, next.teams[team].points + Math.trunc(delta));
  return next;
}

/** The team that would get the steal: the other team once one side has 3 strikes. */
export function stealTeam(game: Game): number | null {
  const round = game.rounds?.[game.round];
  if (!round || isAwarded(round)) return null;
  const struckOut = game.teams.findIndex((t) => t.mistakes >= MAX_STRIKES);
  if (struckOut === -1) return null;
  return struckOut === 0 ? 1 : 0;
}

/** Team (0/1) of the first player/buzzer that buzzed in this round, if any. */
export function firstBuzzTeam(game: Game): number | null {
  const first = game.buzzed?.[0];
  if (!first) return null;
  const team = game.registeredPlayers?.[first.id]?.team ?? first.team ?? null;
  return team === 0 || team === 1 ? team : null;
}

/** True when a round has progress worth protecting from an accidental restart. */
export function hasProgress(game: Game): boolean {
  return (
    game.teams?.some((t) => t.points > 0 || t.mistakes > 0) ||
    game.rounds?.some((r) => isAwarded(r) || r.answers.some((a) => a.trig)) ||
    false
  );
}

/**
 * Undo support: bring back the scoring-related state of a snapshot while keeping
 * everything that may have changed independently since (players, buzzes, settings,
 * team names).
 */
export function restoreScoringState(current: Game, snapshot: Game): Game {
  const next = clone(current);
  next.rounds = clone(snapshot.rounds);
  next.point_tracker = clone(snapshot.point_tracker);
  next.round = snapshot.round;
  next.title = snapshot.title;
  next.is_final_round = snapshot.is_final_round;
  next.is_final_second = snapshot.is_final_second;
  next.hide_first_round = snapshot.hide_first_round;
  next.final_round = clone(snapshot.final_round);
  next.final_round_2 = clone(snapshot.final_round_2);
  next.teams = next.teams.map((team, i) => ({
    ...team,
    points: snapshot.teams[i]?.points ?? team.points,
    mistakes: snapshot.teams[i]?.mistakes ?? team.mistakes,
  }));
  return next;
}

// ---------- Fast money ----------

export function finalRoundSubtotal(rounds: FinalRound[] | undefined): number {
  return (rounds ?? []).reduce((sum, r) => sum + (Number(r.points) || 0), 0);
}

export function finalRoundTotal(game: Game): number {
  return finalRoundSubtotal(game.final_round) + finalRoundSubtotal(game.final_round_2);
}

export function finalRoundWinThreshold(game: Game): number {
  const v = Number(game.settings?.final_round_win_threshold);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : DEFAULT_FINAL_ROUND_WIN_THRESHOLD;
}

export function isFinalRoundWin(game: Game): boolean {
  return finalRoundTotal(game) >= finalRoundWinThreshold(game);
}

/** Decode the legacy selection encoding (negative = chosen but not yet awarded). */
export function finalSelectionIndex(round: FinalRound): number {
  return round.selection >= 0 ? round.selection : -round.selection - 1;
}

/** Award a fast-money answer: index 0 = "no answer", n = answers[n-1]. */
export function awardFinalAnswer(round: FinalRound, selectionIndex: number): FinalRound {
  const chosen = selectionIndex > 0 ? round.answers[selectionIndex - 1] : null;
  const points = chosen ? Number(chosen[1]) || 0 : 0;
  return { ...round, selection: selectionIndex, points, awarded: true };
}
