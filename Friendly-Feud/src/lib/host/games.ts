/** Helpers for the built-in question-set picker. */

export type GameGroupKind = "classic" | "themed" | "other";

export interface GameOption {
  /** Path the server loads, e.g. games/en/normal/game_1.json */
  value: string;
  label: string;
}

export interface GameGroup {
  kind: GameGroupKind;
  options: GameOption[];
}

const KIND_BY_FOLDER: Record<string, GameGroupKind> = {
  normal: "classic",
  tavalised: "classic",
  themed: "themed",
  teemalised: "themed",
};

const KIND_ORDER: GameGroupKind[] = ["classic", "themed", "other"];

function capitalize(word: string): string {
  return word.charAt(0).toLocaleUpperCase() + word.slice(1);
}

/** games/en/normal/game_12.json -> "Game 12" */
export function gameLabel(path: string): string {
  const file = path.split("/").pop() ?? path;
  const name = file.replace(/\.json$/i, "");
  return name
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(capitalize)
    .join(" ");
}

function folderOf(path: string): string {
  const parts = path.split("/");
  return parts.length >= 2 ? parts[parts.length - 2] : "";
}

/** Group files into classic / themed / other sets, each sorted naturally (Game 2 before Game 10). */
export function groupGames(files: string[]): GameGroup[] {
  const byKind = new Map<GameGroupKind, GameOption[]>();
  for (const value of files) {
    const kind = KIND_BY_FOLDER[folderOf(value)] ?? "other";
    const list = byKind.get(kind) ?? [];
    list.push({ value, label: gameLabel(value) });
    byKind.set(kind, list);
  }
  return KIND_ORDER.filter((kind) => byKind.has(kind)).map((kind) => ({
    kind,
    options: byKind.get(kind)!.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
  }));
}
