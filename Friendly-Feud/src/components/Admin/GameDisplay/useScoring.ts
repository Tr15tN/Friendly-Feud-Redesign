import { restoreScoringState } from "@/lib/scoring";
import { Game, WSEvent } from "@/src/types/game";
import { Dispatch, SetStateAction, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const MAX_HISTORY = 50;

export interface ScoringApi {
  /** Apply a new game state: update local state, sync to the room and record it for undo. */
  commit: (next: Game, label: string, extraEvents?: WSEvent[]) => void;
  /** Revert the most recent committed action (scores, strikes, reveals, round). */
  undo: () => void;
  canUndo: boolean;
  /** Label of the action that undo would revert. */
  undoLabel: string | null;
  lastAction: string | null;
}

export function useScoring(
  game: Game,
  setGame: Dispatch<SetStateAction<Game | null>>,
  send: (data: WSEvent) => void
): ScoringApi {
  const { t } = useTranslation();
  const gameRef = useRef(game);
  gameRef.current = game;
  const sendRef = useRef(send);
  sendRef.current = send;
  const historyRef = useRef<{ label: string; snapshot: Game }[]>([]);
  const [historySize, setHistorySize] = useState(0);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const apply = useCallback(
    (next: Game) => {
      gameRef.current = next;
      setGame(next);
      sendRef.current({ action: "data", data: next });
    },
    [setGame]
  );

  const commit = useCallback(
    (next: Game, label: string, extraEvents: WSEvent[] = []) => {
      if (next === gameRef.current) return;
      historyRef.current.push({ label, snapshot: gameRef.current });
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      setHistorySize(historyRef.current.length);
      apply(next);
      extraEvents.forEach((event) => sendRef.current(event));
      setLastAction(label);
    },
    [apply]
  );

  const undo = useCallback(() => {
    const entry = historyRef.current.pop();
    setHistorySize(historyRef.current.length);
    if (!entry) return;
    apply(restoreScoringState(gameRef.current, entry.snapshot));
    setLastAction(t("Undid: {{action}}", { action: entry.label }));
  }, [apply, t]);

  const undoLabel = historySize > 0 ? (historyRef.current[historyRef.current.length - 1]?.label ?? null) : null;

  return { commit, undo, canUndo: historySize > 0, undoLabel, lastAction };
}
