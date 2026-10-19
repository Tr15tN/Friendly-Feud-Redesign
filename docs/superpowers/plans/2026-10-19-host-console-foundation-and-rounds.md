# Host Console Foundation + Rounds Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the new "pro" design system and the redesigned host console frame plus Rounds screen (team columns on desktop, bottom action bar on touch), with Lobby and Fast Money living inside the new frame.

**Architecture:** Pure view-model and flow helpers in `src/lib/host/console.ts` (unit-tested with Vitest) feed thin React components in `src/components/Admin/Console/`. A fixed dark palette is added to Tailwind as `pro-*` tokens. `AdminPage` becomes: top bar, phase router (`GameDisplay`), and two drawers (Players & buzzers, Settings). Scoring logic in `src/lib/scoring` is not touched.

**Tech Stack:** Next.js 16 (pages router), React 19, Tailwind 3.4 + `tailwindcss-themer`, `lucide-react`, i18next, Vitest (node env, no DOM), Playwright e2e. All node tooling runs in Docker (this machine has no `npm`).

**Spec:** `docs/superpowers/specs/2026-10-19-host-console-redesign-design.md`

## Scope of this plan (plan 1 of 4)

In scope: spec sections 3 (design system), 4.1 (frame), 4.3 and 4.4 (Rounds, desktop and touch), and the minimum of 4.2 and 4.5 needed to keep Lobby and Fast Money working inside the new frame.

Deferred to later plans (do **not** do them here):
- Plan 2: restyle Lobby, Fast Money, Players/Buzzers/Settings interiors (they stay legacy-styled, rendered under the existing `darkTheme` so they remain readable).
- Plan 3: TV board and player pages restyle.
- Plan 4: physical buzzer (pad page, server actions, admin prompt, board flash).

Known deliberate deviation from the spec: the steal hint is a banner above the round header (both layouts), not inside the opponent's team column.

## Global Constraints

Copied from the spec; every task must satisfy them.

- Surfaces: background `#0e1013`, panel `#16191f`, border `#252a33`, button fill `#1d2129`, text `#e8eaee`. Muted text `#8b93a3` (adjusted from the spec's `#7c8493` to reach 4.5:1 on button fill). Accent indigo `#5b5ff0` (adjusted from `#6366f1` so white text reaches 4.5:1). Gold `#fbbf24`.
- Teams: Alpha rose `#fb7185`, Bravo emerald `#34d399`. Colour is never the only cue: always pair with the team name.
- Strikes render as a filled square containing a ✕ icon.
- Interactive controls: at least 44px tall on touch (`min-h-11`), `touch-action: manipulation`, visible focus ring, text contrast at least 4.5:1, `prefers-reduced-motion` respected.
- 10px radius, 8px spacing grid, 1px borders, no heavy shadows.
- Keep these keyboard shortcuts: keys 1-8 toggle answers, Ctrl/Cmd+Z undo.
- Preserve existing element `id`s that the Playwright suite uses (`question{i}Button`, `team{n}MistakeButton`, `team{n}GivePointsButton`, `nextRoundButton`, `startRoundOneButton`, `roundSelector`, `titleCardButton`, `hideQuestionsInput`, `finalRoundButton`, `resetMistakesButton`, `showMistakeButton`, `undoButton`, `pointsNumberText`, `pointsText`, `multiplierInput`, `multiplierPreset{m}Button`, `roomCodeText`, `openGameWindowButton`, `quitButton`, `currentScreenText`, `currentRoundQuestionText`, `clearBuzzersButton`, `clearBuzzersButtonDisabled`, `adminTeam{n}Points`, `adminTeam{n}Strikes`, `lastActionText`, `stealHint`).
- Never render the same `id` twice at once (Playwright `getByTestId` uses `id` and fails on duplicates). Desktop and touch layouts are therefore rendered conditionally, not hidden with CSS.
- Imports: inside `src/lib/host/` use relative imports only (Vitest has no path aliases). Everywhere else use the existing aliases `@/components/*`, `@/lib/*`, `@/types/*`.
- New UI strings go into `public/locales/en/translation.json` and `.../et/translation.json` only; other languages fall back to English.
- Run all tooling through `scripts/node-run.sh` (Task 1). Formatting is Prettier (`npx prettier --write <files>`), lint is `npx eslint <files>`, typecheck is `npx tsc --noEmit`.

## File structure

All paths are relative to `Friendly-Feud/`.

Create:
- `scripts/node-run.sh`: run a node command in a throwaway `node:24-alpine` container with the project mounted.
- `scripts/e2e-run.sh`: run the Playwright suite in the official Playwright image.
- `scripts/i18n-merge.mjs`, `scripts/i18n/host-console.en.json`, `scripts/i18n/host-console.et.json`: add missing translation keys without overwriting.
- `docker/docker-compose-local.override.yaml`: publish only the dev proxy on `127.0.0.1:8082`.
- `src/lib/host/console.ts`, `src/lib/host/console.test.ts`: pure helpers (`currentPhase`, `teamColumnState`, `roundDots`, `firstBuzz`, `gotoRound`, `gotoTitle`, `gotoFinal`).
- `src/lib/hooks/useMediaQuery.ts`: media-query hook.
- `src/components/ui/Button.tsx`, `Chip.tsx`, `Menu.tsx`, `Drawer.tsx`: shared primitives.
- `src/components/Admin/Console/team-ui.ts`: per-team class maps.
- `src/components/Admin/Console/useTeamActions.ts`: strike/bank handlers.
- `src/components/Admin/Console/useFlowActions.ts`: round/phase handlers.
- `src/components/Admin/Console/StrikePips.tsx`, `TeamColumn.tsx`, `ScoreStrip.tsx`, `StealHint.tsx`.
- `src/components/Admin/Console/AnswerBoard.tsx`, `RoundToolsMenu.tsx`, `RoundHeader.tsx`, `ActionBar.tsx`, `RoundsConsole.tsx`.
- `src/components/Admin/Console/FastMoneyConsole.tsx`, `BuzzersPlayersPanel.tsx`, `SettingsPanel.tsx`.
- `src/components/Admin/Console/PhaseStepper.tsx`, `FlowMenu.tsx`, `TopBar.tsx`.

Modify:
- `tailwind.config.js`: add `pro` colours and `font-pro`.
- `Makefile`: add `local-dev`, `local-dev-down`.
- `src/components/Admin/HideGameQuestions.tsx`: restyle with `Button`.
- `src/components/Admin/GameDisplay/index.tsx`: becomes the phase router.
- `src/components/Admin/RoomSettings.tsx`: reduced to the setup block.
- `src/components/AdminPage.tsx`: new frame, drawers.
- `public/locales/en/translation.json`, `public/locales/et/translation.json`.
- `e2e/tests/models/AdminPage.ts` and the specs listed in Task 10.

Delete (Task 9): `src/components/Admin/GameDisplay/ScoreBar.tsx`, `TeamControls.tsx`, `AnswerGrid.tsx`, `PhaseBar.tsx`.

---

### Task 1: Baseline commit and local tooling

**Files:**
- Create: `scripts/node-run.sh`, `docker/docker-compose-local.override.yaml`
- Modify: `Makefile`

**Interfaces:**
- Produces: `scripts/node-run.sh <cmd...>` (runs `<cmd>` inside Docker with deps installed; used by every later task), `make local-dev docker_registry=local` (live-reload stack at `http://127.0.0.1:8082`).

- [ ] **Step 1: Make sure git has an identity**

Run (from the repo root `/home/m0usetrap/FF/friendly-feud-scoring-ui`):

```bash
git config user.name && git config user.email
```

Expected: two lines (name, email). If either is empty, stop and ask the user to set them (`git config --global user.name ...`). Do not invent an identity.

- [ ] **Step 2: Commit the imported project as a baseline**

So later diffs are reviewable, snapshot the untouched import first:

```bash
cd /home/m0usetrap/FF/friendly-feud-scoring-ui
git add .gitignore README.md extras Friendly-Feud docs
git commit -m "chore: import scoring-ui branch snapshot and design docs"
git log --oneline | head -3
```

Expected: one commit listed.

- [ ] **Step 3: Create the node runner**

Create `Friendly-Feud/scripts/node-run.sh`:

```bash
#!/usr/bin/env bash
# Run a command inside a throwaway node:24 container with this project mounted.
# node_modules lives in the named docker volume "famf_node_modules" so the host tree stays clean.
# Usage: scripts/node-run.sh npx vitest run
set -euo pipefail
cd "$(dirname "$0")/.."

UID_GID="$(id -u):$(id -g)"
VOLUME=famf_node_modules

if ! docker volume inspect "$VOLUME" >/dev/null 2>&1; then
  docker volume create "$VOLUME" >/dev/null
  docker run --rm -v "$VOLUME":/m alpine chown "$UID_GID" /m
fi

exec docker run --rm -t \
  --user "$UID_GID" \
  -e HOME=/tmp \
  -e npm_config_cache=/tmp/.npm \
  -v "$PWD":/app \
  -v "$VOLUME":/app/node_modules \
  -w /app \
  node:24-alpine \
  sh -c 'if [ ! -f node_modules/.package-lock.json ]; then npm ci --ignore-scripts --no-audit --no-fund; fi; exec "$@"' sh "$@"
```

Then:

```bash
chmod +x Friendly-Feud/scripts/node-run.sh
```

- [ ] **Step 4: Verify the existing unit tests run**

Run (from `Friendly-Feud/`; needs network on first run, so allow it):

```bash
scripts/node-run.sh npx vitest run
```

Expected: ends with `Test Files  1 passed (1)` (the scoring tests) and exit code 0. The first run installs dependencies and is slow (a few minutes).

- [ ] **Step 5: Verify typecheck and lint baseline**

```bash
scripts/node-run.sh npx tsc --noEmit
scripts/node-run.sh npx eslint src/lib src/components/Admin
```

Expected: both exit 0 with no errors. If either fails on the untouched baseline, note the failures in the commit message of Step 8 and do not try to fix unrelated code.

- [ ] **Step 6: Add the dev-stack override**

Create `Friendly-Feud/docker/docker-compose-local.override.yaml`:

```yaml
# Layered on top of docker-compose-dev.yaml: publish only the nginx proxy, on localhost:8082.
services:
  proxy:
    ports: !override
      - "127.0.0.1:8082:80"
  frontend:
    ports: !reset []
  backend:
    ports: !reset []
```

- [ ] **Step 7: Add Makefile targets**

Append to `Friendly-Feud/Makefile`:

```make

# Live-reload dev stack for UI work: http://127.0.0.1:8082 (use: make local-dev docker_registry=local)
local-dev: build-dev
	docker compose -p famfdev -f ./docker/docker-compose-dev.yaml -f ./docker/docker-compose-local.override.yaml up -d --wait --wait-timeout 180 || (docker compose -p famfdev logs && exit 1)
	echo "Dev UI: http://127.0.0.1:8082"

local-dev-down:
	docker compose -p famfdev -f ./docker/docker-compose-dev.yaml -f ./docker/docker-compose-local.override.yaml down
```

- [ ] **Step 8: Start the dev stack and check it**

```bash
cd Friendly-Feud
make local-dev docker_registry=local
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8082/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8082/api/health
```

Expected: `Dev UI: http://127.0.0.1:8082`, then `200` and `200`. (If port 8082 is taken, change it in the override file and every later URL.)

- [ ] **Step 9: Commit**

```bash
cd /home/m0usetrap/FF/friendly-feud-scoring-ui
git add Friendly-Feud/scripts/node-run.sh Friendly-Feud/docker/docker-compose-local.override.yaml Friendly-Feud/Makefile
git commit -m "chore: add dockerised node runner and live-reload dev stack"
```

---

### Task 2: Pure console helpers (TDD)

**Files:**
- Create: `src/lib/host/console.ts`
- Test: `src/lib/host/console.test.ts`

**Interfaces:**
- Consumes: `isAwarded`, `roundPot`, `firstBuzzTeam`, `MAX_STRIKES` from `src/lib/scoring/index.ts`.
- Produces (used by Tasks 4-9):
  - `type Phase = "lobby" | "rounds" | "fastmoney"`
  - `currentPhase(game: Game): Phase`
  - `interface TeamColumnState { team: number; name: string; points: number; strikes: number; maxStrikes: number; pot: number; roundAwarded: boolean; banked: boolean; bankedPoints: number; inControl: boolean; canBank: boolean }`
  - `teamColumnState(game: Game, team: number): TeamColumnState`
  - `interface RoundDot { index: number; current: boolean; awarded: boolean }`
  - `roundDots(game: Game): RoundDot[]`
  - `firstBuzz(game: Game): { team: number | null; name: string | null }`
  - `gotoRound(game: Game, roundIndex: number): Game`, `gotoTitle(game: Game): Game`, `gotoFinal(game: Game): Game` (all return a new object, never mutate the input).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/host/console.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
scripts/node-run.sh npx vitest run src/lib/host/console.test.ts
```

Expected: FAIL with an import-resolution error for `./console` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/host/console.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
scripts/node-run.sh npx vitest run
```

Expected: `Test Files  2 passed (2)`, all tests PASS.

- [ ] **Step 5: Format, lint, typecheck**

```bash
scripts/node-run.sh npx prettier --write src/lib/host/console.ts src/lib/host/console.test.ts
scripts/node-run.sh npx eslint src/lib/host
scripts/node-run.sh npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add Friendly-Feud/src/lib/host
git commit -m "feat(host): add pure console view-model and flow helpers with tests"
```

---

### Task 3: Design tokens and shared primitives

**Files:**
- Modify: `tailwind.config.js`
- Create: `src/lib/hooks/useMediaQuery.ts`, `src/components/ui/Button.tsx`, `src/components/ui/Chip.tsx`, `src/components/ui/Menu.tsx`, `src/components/ui/Drawer.tsx`

**Interfaces:**
- Produces:
  - Tailwind classes `bg-pro-bg|panel|raised`, `border-pro-line`, `text-pro-text|mute|gold|ok|danger-text`, `bg-pro-accent`, `hover:bg-pro-accent-hover`, `pro-team0|team0-on|team1|team1-on`, `font-pro`.
  - `useMediaQuery(query: string, serverValue?: boolean): boolean`
  - `type ButtonVariant = "secondary" | "primary" | "team0" | "team1" | "team0-outline" | "team1-outline" | "danger" | "ghost"`
  - `buttonClass(variant?: ButtonVariant, extra?: string): string`
  - `Button` (forwardRef, props = `ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }`, defaults `type="button"`).
  - `Chip` (props `{ tone?: "neutral" | "ok" | "gold" | "accent" } & HTMLAttributes<HTMLSpanElement>`).
  - `Menu` (default export; props below), `Drawer` (default export; props below).

- [ ] **Step 1: Add the palette to Tailwind**

In `tailwind.config.js` replace

```js
  theme: {
    extend: {},
  },
```

with

```js
  theme: {
    extend: {
      colors: {
        // Host console / player pages "pro" palette. Fixed (not themed).
        pro: {
          bg: "#0e1013",
          panel: "#16191f",
          raised: "#1d2129",
          line: "#252a33",
          text: "#e8eaee",
          mute: "#8b93a3",
          accent: "#5b5ff0",
          "accent-hover": "#4a4ed8",
          gold: "#fbbf24",
          ok: "#34d399",
          danger: "#ef4444",
          "danger-text": "#f87171",
          team0: "#fb7185",
          "team0-on": "#2a0610",
          team1: "#34d399",
          "team1-on": "#04251a",
        },
      },
      fontFamily: {
        pro: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
```

- [ ] **Step 2: Create the media-query hook**

Create `src/lib/hooks/useMediaQuery.ts`:

```ts
import { useSyncExternalStore } from "react";

/** Subscribe to a CSS media query. `serverValue` is used for server rendering only. */
export function useMediaQuery(query: string, serverValue = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}
```

- [ ] **Step 3: Create `Button`**

Create `src/components/ui/Button.tsx`:

```tsx
import { ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant =
  | "secondary"
  | "primary"
  | "team0"
  | "team1"
  | "team0-outline"
  | "team1-outline"
  | "danger"
  | "ghost";

const BASE =
  "inline-flex min-h-11 touch-manipulation select-none items-center justify-center gap-2 rounded-[10px] border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold disabled:cursor-not-allowed disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  secondary: "border-pro-line bg-pro-raised text-pro-text hover:bg-pro-line",
  primary: "border-transparent bg-pro-accent text-white hover:bg-pro-accent-hover",
  team0: "border-transparent bg-pro-team0 text-pro-team0-on hover:brightness-110",
  team1: "border-transparent bg-pro-team1 text-pro-team1-on hover:brightness-110",
  "team0-outline": "border-pro-team0/50 bg-pro-raised text-pro-team0 hover:bg-pro-line",
  "team1-outline": "border-pro-team1/50 bg-pro-raised text-pro-team1 hover:bg-pro-line",
  danger: "border-pro-danger/50 bg-pro-raised text-pro-danger-text hover:bg-pro-line",
  ghost: "border-transparent bg-transparent text-pro-mute hover:bg-pro-raised hover:text-pro-text",
};

/** Class string for anything that must look like a Button but is not one (links, ConfirmButton). */
export function buttonClass(variant: ButtonVariant = "secondary", extra = ""): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`.trim();
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", className = "", type = "button", ...rest },
  ref
) {
  return <button ref={ref} type={type} className={buttonClass(variant, className)} {...rest} />;
});
```

- [ ] **Step 4: Create `Chip`**

Create `src/components/ui/Chip.tsx`:

```tsx
import { HTMLAttributes } from "react";

type Tone = "neutral" | "ok" | "gold" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-pro-raised text-pro-mute",
  ok: "bg-pro-ok/15 text-pro-ok",
  gold: "bg-pro-gold/15 text-pro-gold",
  accent: "bg-pro-accent/25 text-pro-text",
};

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export default function Chip({ tone = "neutral", className = "", ...rest }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
      {...rest}
    />
  );
}
```

- [ ] **Step 5: Create `Menu`**

Create `src/components/ui/Menu.tsx`:

```tsx
import { ReactNode, useEffect, useRef, useState } from "react";
import { buttonClass, ButtonVariant } from "./Button";

interface MenuProps {
  buttonId: string;
  ariaLabel: string;
  label: ReactNode;
  variant?: ButtonVariant;
  /** Which edge of the button the panel lines up with. */
  align?: "left" | "right";
  /** Open above the button instead of below (used by the touch action bar). */
  direction?: "down" | "up";
  buttonClassName?: string;
  panelClassName?: string;
  /** Panel content is only mounted while the menu is open. */
  children: (api: { close: () => void }) => ReactNode;
}

/** A button that toggles a popover panel. Closes on outside press and Escape. */
export default function Menu({
  buttonId,
  ariaLabel,
  label,
  variant = "secondary",
  align = "right",
  direction = "down",
  buttonClassName = "",
  panelClassName = "",
  children,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const placement = `${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"} ${align === "right" ? "right-0" : "left-0"}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        id={buttonId}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={buttonClass(variant, buttonClassName)}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open && (
        <div
          className={`absolute z-40 min-w-64 rounded-[12px] border border-pro-line bg-pro-panel p-3 text-pro-text shadow-xl ${placement} ${panelClassName}`}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create `Drawer`**

Create `src/components/ui/Drawer.tsx`:

```tsx
import { buttonClass } from "@/components/ui/Button";
import { X } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface DrawerProps {
  id: string;
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Right-hand slide-over. Content is only mounted while open. The `darkTheme` class keeps the legacy
 * themed components inside it readable on the dark surface.
 */
export default function Drawer({ id, open, title, onClose, children }: DrawerProps) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <aside
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="darkTheme relative flex h-full w-full flex-col border-l border-pro-line bg-pro-bg text-pro-text shadow-2xl sm:w-[520px]"
      >
        <header className="flex items-center justify-between border-b border-pro-line px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={t("Close")}
            className={buttonClass("ghost", "px-2")}
            onClick={onClose}
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
```

- [ ] **Step 7: Format, lint, typecheck**

```bash
scripts/node-run.sh npx prettier --write tailwind.config.js src/lib/hooks src/components/ui
scripts/node-run.sh npx eslint src/lib src/components/ui
scripts/node-run.sh npx tsc --noEmit
```

Expected: no errors. (`lucide-react` provides `X`.)

- [ ] **Step 8: Commit**

```bash
git add Friendly-Feud/tailwind.config.js Friendly-Feud/src/lib/hooks Friendly-Feud/src/components/ui
git commit -m "feat(ui): add pro design tokens and shared Button/Chip/Menu/Drawer primitives"
```

---

### Task 4: Team column, score strip, steal hint

**Files:**
- Create: `src/components/Admin/Console/team-ui.ts`, `useTeamActions.ts`, `StrikePips.tsx`, `TeamColumn.tsx`, `ScoreStrip.tsx`, `StealHint.tsx`

**Interfaces:**
- Consumes: `teamColumnState` (Task 2); `Button`, `Chip` (Task 3); `ScoringApi` from `@/components/Admin/GameDisplay/useScoring`; `addStrike`, `awardRound`, `roundPot`, `stealTeam` from `@/lib/scoring`.
- Produces:
  - `teamUi(team: number): { text: string; border: string; dot: string; solid: ButtonVariant; outline: ButtonVariant }`
  - `useTeamActions(game: Game, scoring: ScoringApi): { name: (team: number) => string; strike: (team: number) => void; bank: (team: number) => void }`
  - `<StrikePips team count max align? />`, `<TeamColumn game team scoring />`, `<ScoreStrip game />`, `<StealHint game />`.

- [ ] **Step 1: Create the team style map**

Create `src/components/Admin/Console/team-ui.ts`:

```ts
import type { ButtonVariant } from "@/components/ui/Button";

export interface TeamUi {
  text: string;
  border: string;
  dot: string;
  solid: ButtonVariant;
  outline: ButtonVariant;
}

// Static class strings so Tailwind's JIT can see every name.
const TEAM_UI: TeamUi[] = [
  { text: "text-pro-team0", border: "border-pro-team0/40", dot: "bg-pro-team0", solid: "team0", outline: "team0-outline" },
  { text: "text-pro-team1", border: "border-pro-team1/40", dot: "bg-pro-team1", solid: "team1", outline: "team1-outline" },
];

export function teamUi(team: number): TeamUi {
  return TEAM_UI[team] ?? TEAM_UI[0];
}
```

- [ ] **Step 2: Create the strike/bank handlers**

Create `src/components/Admin/Console/useTeamActions.ts`:

```ts
import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { addStrike, awardRound, roundPot } from "@/lib/scoring";
import { getTeamDisplayName } from "@/lib/utils";
import { Game } from "@/types/game";
import { useTranslation } from "react-i18next";

/** Strike and bank handlers shared by the desktop team columns and the touch action bar. */
export function useTeamActions(game: Game, scoring: ScoringApi) {
  const { t } = useTranslation();
  const name = (team: number) => getTeamDisplayName(game.teams[team].name, team, t);

  return {
    name,
    strike: (team: number) => {
      const next = addStrike(game, team);
      scoring.commit(next, t("Strike for {{team}}", { team: name(team) }), [
        { action: "mistake", data: next.teams[team].mistakes },
      ]);
    },
    bank: (team: number) => {
      const pot = roundPot(game.rounds[game.round]);
      scoring.commit(awardRound(game, team), t("Awarded {{points}} to {{team}}", { points: pot, team: name(team) }));
    },
  };
}
```

- [ ] **Step 3: Create `StrikePips`**

Create `src/components/Admin/Console/StrikePips.tsx`:

```tsx
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StrikePipsProps {
  team: number;
  count: number;
  max: number;
  align?: "start" | "end";
}

/** Three-slot strike tracker. A filled slot always contains a ✕ glyph, so it never relies on colour alone. */
export default function StrikePips({ team, count, max, align = "start" }: StrikePipsProps) {
  const { t } = useTranslation();
  return (
    <div
      id={`adminTeam${team}Strikes`}
      role="img"
      aria-label={t("Strikes {{count}} of {{max}}", { count, max })}
      className={`flex gap-1 ${align === "end" ? "justify-end" : ""}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`grid size-6 place-items-center rounded-md border ${
            i < count ? "border-pro-danger bg-pro-danger text-white" : "border-pro-line text-transparent"
          }`}
        >
          <X size={14} strokeWidth={3} aria-hidden />
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `TeamColumn` (desktop)**

Create `src/components/Admin/Console/TeamColumn.tsx`:

```tsx
import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { Button } from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { teamColumnState } from "@/lib/host/console";
import { Game } from "@/types/game";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import StrikePips from "./StrikePips";
import { teamUi } from "./team-ui";
import { useTeamActions } from "./useTeamActions";

interface TeamColumnProps {
  game: Game;
  team: number;
  scoring: ScoringApi;
}

/** One team's score, strikes and the two actions that affect it: strike and bank the pot. */
export default function TeamColumn({ game, team, scoring }: TeamColumnProps) {
  const { t } = useTranslation();
  const state = teamColumnState(game, team);
  const ui = teamUi(team);
  const actions = useTeamActions(game, scoring);
  const name = actions.name(team);

  return (
    <aside aria-label={name} className={`flex flex-col gap-3 rounded-[14px] border bg-pro-panel p-4 ${ui.border}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`size-2.5 shrink-0 rounded-full ${ui.dot}`} aria-hidden />
        <h2 className={`min-w-0 truncate text-sm font-semibold uppercase tracking-wider ${ui.text}`}>{name}</h2>
        {state.banked && <Chip tone="ok">{t("banked")}</Chip>}
        {state.inControl && <Chip tone="gold">{t("buzzed first")}</Chip>}
      </div>
      <p id={`adminTeam${team}Points`} className="text-5xl font-bold tabular-nums tracking-tight">
        {t("number", { count: state.points })}
      </p>
      <StrikePips team={team} count={state.strikes} max={state.maxStrikes} />
      <Button id={`team${team}MistakeButton`} variant={ui.outline} onClick={() => actions.strike(team)}>
        <X size={16} strokeWidth={3} aria-hidden />
        {t("Strike")}
      </Button>
      <Button
        id={`team${team}GivePointsButton`}
        variant={ui.solid}
        disabled={!state.canBank && !state.banked}
        aria-pressed={state.banked}
        onClick={() => actions.bank(team)}
      >
        {state.banked ? (
          <>
            <Check size={16} strokeWidth={3} aria-hidden />
            {t("Banked {{points}}", { points: state.bankedPoints })}
          </>
        ) : (
          t("Bank {{points}}", { points: state.pot })
        )}
      </Button>
    </aside>
  );
}
```

- [ ] **Step 5: Create `ScoreStrip` (touch)**

Create `src/components/Admin/Console/ScoreStrip.tsx`:

```tsx
import Chip from "@/components/ui/Chip";
import { teamColumnState } from "@/lib/host/console";
import { getTeamDisplayName } from "@/lib/utils";
import { Game } from "@/types/game";
import { useTranslation } from "react-i18next";
import StrikePips from "./StrikePips";
import { teamUi } from "./team-ui";

/** Compact two-team score readout for narrow screens (replaces the team columns). */
export default function ScoreStrip({ game }: { game: Game }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-2">
      {[0, 1].map((team) => {
        const state = teamColumnState(game, team);
        const ui = teamUi(team);
        const align = team === 1 ? "end" : "start";
        return (
          <div
            key={team}
            className={`flex min-w-0 flex-col gap-1 rounded-[12px] border bg-pro-panel p-3 ${ui.border} ${
              team === 1 ? "items-end text-right" : ""
            }`}
          >
            <div className="flex max-w-full items-center gap-2">
              <span className={`size-2 shrink-0 rounded-full ${ui.dot}`} aria-hidden />
              <span className={`truncate text-xs font-semibold uppercase tracking-wider ${ui.text}`}>
                {getTeamDisplayName(state.name, team, t)}
              </span>
            </div>
            <p id={`adminTeam${team}Points`} className="text-3xl font-bold tabular-nums">
              {t("number", { count: state.points })}
            </p>
            <StrikePips team={team} count={state.strikes} max={state.maxStrikes} align={align} />
            <div className="flex flex-wrap gap-1">
              {state.banked && <Chip tone="ok">{t("banked")}</Chip>}
              {state.inControl && <Chip tone="gold">{t("buzzed first")}</Chip>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Create `StealHint`**

Create `src/components/Admin/Console/StealHint.tsx`:

```tsx
import { stealTeam } from "@/lib/scoring";
import { getTeamDisplayName } from "@/lib/utils";
import { Game } from "@/types/game";
import { useTranslation } from "react-i18next";

/** Shown once a team has 3 strikes. It only hints: the host decides who banks the pot. */
export default function StealHint({ game }: { game: Game }) {
  const { t } = useTranslation();
  const steal = stealTeam(game);
  if (steal === null) return null;
  const name = (team: number) => getTeamDisplayName(game.teams[team].name, team, t);
  const struckOut = steal === 0 ? 1 : 0;
  return (
    <p
      id="stealHint"
      role="status"
      className="rounded-[10px] border border-pro-gold/50 bg-pro-gold/10 px-4 py-3 text-sm text-pro-gold"
    >
      <b>{t("{{team}} has 3 strikes.", { team: name(struckOut) })}</b>{" "}
      {t("{{team}} can steal: award the pot to whoever wins it.", { team: name(steal) })}
    </p>
  );
}
```

- [ ] **Step 7: Format, lint, typecheck**

```bash
scripts/node-run.sh npx prettier --write src/components/Admin/Console
scripts/node-run.sh npx eslint src/components/Admin/Console
scripts/node-run.sh npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add Friendly-Feud/src/components/Admin/Console
git commit -m "feat(host): add team column, score strip and steal hint components"
```

---

### Task 5: Answer board

**Files:**
- Create: `src/components/Admin/Console/AnswerBoard.tsx`

**Interfaces:**
- Consumes: `toggleAnswer`, `isAwarded`, `sanitizeMultiplier`, `answerValue` from `@/lib/scoring`; `ScoringApi`.
- Produces: `<AnswerBoard game scoring />`. Tiles keep ids `question{i}Button`, `answer{i}PointsText`, and `lastActionText`.

**Gotcha (do not "simplify"):** the e2e suite reads a tile's points with `innerText().replace(/^\D+/g, "")`. The key number on a hidden tile must therefore be drawn by CSS (`before:content-[attr(data-key)]`), not as a text node; otherwise `innerText` starts with a digit and the parsed value is wrong.

- [ ] **Step 1: Create the component**

Create `src/components/Admin/Console/AnswerBoard.tsx`:

```tsx
import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { answerValue, isAwarded, sanitizeMultiplier, toggleAnswer } from "@/lib/scoring";
import { Game } from "@/types/game";
import { Check, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AnswerBoardProps {
  game: Game;
  scoring: ScoringApi;
}

const TILE_STYLES = {
  hidden: "border-pro-line bg-pro-raised text-pro-text hover:border-pro-accent",
  scored: "border-pro-ok bg-pro-ok/15 text-pro-text",
  cleanup: "border-dashed border-pro-mute bg-pro-panel text-pro-mute",
} as const;

const BADGE_STYLES = {
  // The digit comes from CSS (see the gotcha above), so it is not part of innerText.
  hidden: "bg-pro-bg text-pro-mute before:content-[attr(data-key)]",
  scored: "bg-pro-ok text-pro-team1-on",
  cleanup: "bg-pro-line text-pro-mute",
} as const;

export default function AnswerBoard({ game, scoring }: AnswerBoardProps) {
  const { t } = useTranslation();
  const round = game.rounds[game.round];
  const multiplier = sanitizeMultiplier(round.multiply);
  const awarded = isAwarded(round);

  return (
    <section className="rounded-[14px] border border-pro-line bg-pro-panel p-4">
      <p className="mb-3 text-xs text-pro-mute">
        {awarded
          ? t("Round awarded: further reveals are not scored.")
          : t("Click an answer to reveal it on the board.")}{" "}
        {t("Keys 1–8 toggle answers.")}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-flow-col sm:grid-rows-4">
        {round.answers.map((answer, index) => {
          const state = !answer.trig ? "hidden" : answer.cleanup ? "cleanup" : "scored";
          return (
            <button
              key={`answer-${index}`}
              type="button"
              id={`question${index}Button`}
              aria-pressed={answer.trig}
              aria-keyshortcuts={`${index + 1}`}
              className={`flex min-h-14 touch-manipulation items-center justify-between gap-3 rounded-[10px] border px-3 py-2 text-left text-base font-bold uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold ${TILE_STYLES[state]}`}
              onClick={() => {
                const { game: next, revealed } = toggleAnswer(game, index);
                const label = revealed
                  ? t("Revealed {{answer}}", { answer: answer.ans })
                  : t("Hid {{answer}}", { answer: answer.ans });
                scoring.commit(next, label, revealed ? [{ action: "reveal" }] : []);
              }}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  data-key={index + 1}
                  className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs ${BADGE_STYLES[state]}`}
                >
                  {state === "scored" ? <Check size={14} strokeWidth={3} /> : state === "cleanup" ? <Minus size={14} /> : null}
                </span>
                <span className="truncate">{answer.ans}</span>
              </span>
              <span className="shrink-0 tabular-nums" id={`answer${index}PointsText`}>
                {t("number", { count: answer.pnt })}
                {multiplier > 1 && (
                  <span className="ml-1 text-sm font-semibold opacity-80">
                    → {t("number", { count: answerValue(round, answer.pnt) })}
                  </span>
                )}
                {state === "cleanup" && (
                  <span className="ml-2 text-xs font-semibold normal-case">({t("not scored")})</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {scoring.lastAction && (
        <p id="lastActionText" className="mt-3 text-xs text-pro-mute">
          {t("Last action")}: {scoring.lastAction}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Format, lint, typecheck**

```bash
scripts/node-run.sh npx prettier --write src/components/Admin/Console/AnswerBoard.tsx
scripts/node-run.sh npx eslint src/components/Admin/Console
scripts/node-run.sh npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add Friendly-Feud/src/components/Admin/Console/AnswerBoard.tsx
git commit -m "feat(host): add answer board tiles"
```

---

### Task 6: Flow actions and the Rounds screen

**Files:**
- Create: `src/components/Admin/Console/useFlowActions.ts`, `RoundToolsMenu.tsx`, `RoundHeader.tsx`, `ActionBar.tsx`, `RoundsConsole.tsx`

**Interfaces:**
- Consumes: Tasks 2-5 outputs; `Menu` (Task 3); `adjustTeamPoints`, `removeStrike`, `resetStrikes`, `setMultiplier`, `isAwarded`, `sanitizeMultiplier`, `hasProgress` from `@/lib/scoring`.
- Produces:
  - `useFlowActions(game, scoring)` returning `{ inProgress: boolean; startNeedsConfirm: boolean; goToRound(i: number): void; startRoundOne(): void; nextRound(): void; showTitle(): void; goFinal(): void }`; `type FlowActions`.
  - `<RoundToolsMenu game scoring send direction? buttonClassName? />` (button id `roundToolsButton`).
  - `<RoundsConsole game scoring flow send />`.

- [ ] **Step 1: Create the flow hook**

Create `src/components/Admin/Console/useFlowActions.ts`:

```ts
import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { gotoFinal, gotoRound, gotoTitle } from "@/lib/host/console";
import { hasProgress } from "@/lib/scoring";
import { Game } from "@/types/game";
import { useTranslation } from "react-i18next";

/** Round and phase transitions, all routed through `scoring.commit` so they can be undone. */
export function useFlowActions(game: Game, scoring: ScoringApi) {
  const { t } = useTranslation();
  const inProgress = hasProgress(game);

  return {
    inProgress,
    /** Restarting at round 1 asks for confirmation unless we are already on round 1 of a live game. */
    startNeedsConfirm: inProgress && !(game.round === 0 && !game.title && !game.is_final_round),
    goToRound: (roundIndex: number) =>
      scoring.commit(gotoRound(game, roundIndex), `${t("round")} ${roundIndex + 1}`),
    startRoundOne: () => scoring.commit(gotoRound(game, 0), t("Start Round 1")),
    nextRound: () => scoring.commit(gotoRound(game, game.round + 1), t("Next Round")),
    showTitle: () => scoring.commit(gotoTitle(game), t("Title Card")),
    goFinal: () =>
      scoring.commit(gotoFinal(game), t("Final Round"), [{ action: "set_timer", data: game.final_round_timers[0] }]),
  };
}

export type FlowActions = ReturnType<typeof useFlowActions>;
```

- [ ] **Step 2: Create the round tools menu**

Create `src/components/Admin/Console/RoundToolsMenu.tsx`:

```tsx
import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { Button } from "@/components/ui/Button";
import Menu from "@/components/ui/Menu";
import { adjustTeamPoints, removeStrike, resetStrikes } from "@/lib/scoring";
import { getTeamDisplayName } from "@/lib/utils";
import { Game, WSEvent } from "@/types/game";
import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface RoundToolsMenuProps {
  game: Game;
  scoring: ScoringApi;
  send: (data: WSEvent) => void;
  direction?: "down" | "up";
  buttonClassName?: string;
}

const LABEL = "mb-2 text-xs font-semibold uppercase tracking-widest text-pro-mute";

/** Secondary scoring tools: remove a strike, reset strikes, flash the X, manual point adjustment. */
export default function RoundToolsMenu({ game, scoring, send, direction = "down", buttonClassName = "" }: RoundToolsMenuProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("10");
  const name = (team: number) => getTeamDisplayName(game.teams[team].name, team, t);

  const adjust = (team: number, sign: 1 | -1) => {
    const value = Math.abs(parseInt(amount, 10)) * sign;
    if (!Number.isFinite(value) || value === 0) return;
    scoring.commit(
      adjustTeamPoints(game, team, value),
      t("Adjusted {{team}} by {{amount}}", { team: name(team), amount: value > 0 ? `+${value}` : `${value}` })
    );
  };

  return (
    <Menu
      buttonId="roundToolsButton"
      ariaLabel={t("Round tools")}
      label={<Ellipsis size={18} aria-hidden />}
      direction={direction}
      buttonClassName={buttonClassName}
      panelClassName="w-72 space-y-4"
    >
      {({ close }) => (
        <>
          <section>
            <p className={LABEL}>{t("Remove a strike")}</p>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((team) => (
                <Button
                  key={team}
                  id={`team${team}RemoveStrikeButton`}
                  disabled={game.teams[team].mistakes === 0}
                  className="min-w-0"
                  onClick={() =>
                    scoring.commit(removeStrike(game, team), t("Removed a strike from {{team}}", { team: name(team) }))
                  }
                >
                  <span className="truncate">− {name(team)}</span>
                </Button>
              ))}
            </div>
          </section>
          <section className="space-y-2">
            <Button
              id="resetMistakesButton"
              className="w-full"
              onClick={() => {
                scoring.commit(resetStrikes(game), t("Reset Mistakes"));
                close();
              }}
            >
              {t("Reset Mistakes")}
            </Button>
            <Button
              id="showMistakeButton"
              className="w-full"
              title={t("Shows the big X on screen without adding a strike")}
              onClick={() => {
                send({ action: "show_mistake" });
                close();
              }}
            >
              {t("Buzz-in X (no strike)")}
            </Button>
          </section>
          <section>
            <p className={LABEL}>{t("Manual adjust")}</p>
            <input
              id="manualAdjustInput"
              type="number"
              min="1"
              aria-label={t("points")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mb-2 min-h-11 w-full rounded-[10px] border border-pro-line bg-pro-raised px-3 text-pro-text"
            />
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((team) => (
                <div key={team} className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-xs text-pro-mute">{name(team)}</span>
                  <div className="flex gap-1">
                    <Button id={`team${team}AdjustMinusButton`} className="flex-1 px-0" onClick={() => adjust(team, -1)}>
                      −
                    </Button>
                    <Button id={`team${team}AdjustPlusButton`} className="flex-1 px-0" onClick={() => adjust(team, 1)}>
                      +
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </Menu>
  );
}
```

- [ ] **Step 3: Create the round header**

Create `src/components/Admin/Console/RoundHeader.tsx`:

```tsx
import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { Button } from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { firstBuzz, roundDots } from "@/lib/host/console";
import { isAwarded, roundPot, sanitizeMultiplier, setMultiplier } from "@/lib/scoring";
import { getTeamDisplayName } from "@/lib/utils";
import { Game, WSEvent } from "@/types/game";
import { Check, Undo2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import RoundToolsMenu from "./RoundToolsMenu";
import { FlowActions } from "./useFlowActions";

const MULTIPLIER_PRESETS = [1, 2, 3];

interface RoundHeaderProps {
  game: Game;
  scoring: ScoringApi;
  flow: FlowActions;
  send: (data: WSEvent) => void;
  /** Desktop shows the tools menu here; touch shows it in the action bar. */
  showTools: boolean;
}

/** Pot, multiplier, undo, round navigation, first-buzz chip and the question. */
export default function RoundHeader({ game, scoring, flow, send, showTools }: RoundHeaderProps) {
  const { t } = useTranslation();
  const round = game.rounds[game.round];
  const multiplier = sanitizeMultiplier(round.multiply);
  const locked = isAwarded(round);
  const awardedTo = round.awarded_to;
  const buzz = firstBuzz(game);
  const buzzTeamName = buzz.team !== null ? getTeamDisplayName(game.teams[buzz.team].name, buzz.team, t) : "";

  const changeMultiplier = (value: unknown) => {
    scoring.commit(setMultiplier(game, value), t("Multiplier set to x{{count}}", { count: sanitizeMultiplier(value) }));
  };

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-pro-line bg-pro-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p id="pointsText" className="text-xs uppercase tracking-widest text-pro-mute">
            {t("round")} {t("number", { count: game.round + 1 })} / {t("number", { count: game.rounds.length })} ·{" "}
            {awardedTo === 0 || awardedTo === 1
              ? t("Banked by {{team}}", { team: getTeamDisplayName(game.teams[awardedTo].name, awardedTo, t) })
              : t("Pot")}
          </p>
          <p id="pointsNumberText" className="text-5xl font-extrabold tabular-nums tracking-tight">
            {t("number", { count: roundPot(round) })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span id="multiplierText" className="sr-only">
            {t("multiplier")}
          </span>
          <div role="group" aria-label={t("multiplier")} className="inline-flex overflow-hidden rounded-[10px] border border-pro-line">
            {MULTIPLIER_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                id={`multiplierPreset${preset}Button`}
                aria-pressed={multiplier === preset}
                disabled={locked}
                className={`min-h-11 touch-manipulation px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold disabled:opacity-40 lg:min-h-9 ${
                  multiplier === preset ? "bg-pro-gold text-black" : "bg-pro-raised text-pro-mute hover:text-pro-text"
                }`}
                onClick={() => changeMultiplier(preset)}
              >
                ×{preset}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1 text-xs text-pro-mute">
            ×
            <input
              type="number"
              id="multiplierInput"
              min="1"
              aria-label={t("multiplier")}
              disabled={locked}
              value={multiplier}
              onChange={(e) => changeMultiplier(e.target.value)}
              className="min-h-11 w-16 rounded-[10px] border border-pro-line bg-pro-raised px-2 text-pro-text disabled:opacity-40 lg:min-h-9"
            />
          </label>
          <Button
            id="undoButton"
            disabled={!scoring.canUndo}
            title={scoring.undoLabel ? t("Undo: {{action}}", { action: scoring.undoLabel }) : t("Nothing to undo")}
            aria-keyshortcuts="Control+Z"
            onClick={scoring.undo}
          >
            <Undo2 size={16} aria-hidden />
            <span className="hidden sm:inline">{t("Undo")}</span>
          </Button>
          {showTools && <RoundToolsMenu game={game} scoring={scoring} send={send} />}
        </div>
      </div>

      <nav aria-label={t("Rounds")} className="flex flex-wrap items-center gap-1.5">
        {roundDots(game).map((dot) => (
          <button
            key={dot.index}
            type="button"
            id={`roundChip${dot.index}`}
            aria-current={dot.current ? "step" : undefined}
            aria-label={`${t("round")} ${dot.index + 1}`}
            className={`inline-flex h-11 min-w-11 touch-manipulation items-center justify-center gap-1 rounded-lg border px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold lg:h-9 lg:min-w-9 ${
              dot.current
                ? "border-transparent bg-pro-accent text-white"
                : dot.awarded
                  ? "border-pro-ok/50 bg-pro-raised text-pro-ok"
                  : "border-pro-line bg-pro-raised text-pro-mute hover:text-pro-text"
            }`}
            onClick={() => {
              if (!dot.current) flow.goToRound(dot.index);
            }}
          >
            {dot.awarded && !dot.current ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
            {dot.index + 1}
          </button>
        ))}
      </nav>

      {buzz.team !== null && !locked && (
        <div>
          <Chip id="firstBuzzChip" tone="gold">
            <Zap size={12} aria-hidden />
            {t("Buzzed first: {{team}}", { team: buzzTeamName })}
            {buzz.name ? ` · ${buzz.name}` : ""}
          </Chip>
        </div>
      )}

      <p id="currentRoundQuestionText" className="text-lg font-semibold">
        {round.question}
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Create the touch action bar**

Create `src/components/Admin/Console/ActionBar.tsx`:

```tsx
import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { Button } from "@/components/ui/Button";
import { teamColumnState } from "@/lib/host/console";
import { Game, WSEvent } from "@/types/game";
import { ArrowRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import RoundToolsMenu from "./RoundToolsMenu";
import { teamUi } from "./team-ui";
import { FlowActions } from "./useFlowActions";
import { useTeamActions } from "./useTeamActions";

interface ActionBarProps {
  game: Game;
  scoring: ScoringApi;
  flow: FlowActions;
  send: (data: WSEvent) => void;
}

/** Fixed bottom bar for narrow screens: every scoring action within thumb reach. */
export default function ActionBar({ game, scoring, flow, send }: ActionBarProps) {
  const { t } = useTranslation();
  const actions = useTeamActions(game, scoring);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-pro-line bg-pro-bg/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
        {[0, 1].map((team) => (
          <Button
            key={`strike-${team}`}
            id={`team${team}MistakeButton`}
            variant={teamUi(team).outline}
            aria-label={`${t("Strike")}: ${actions.name(team)}`}
            className="min-w-0"
            onClick={() => actions.strike(team)}
          >
            <X size={16} strokeWidth={3} aria-hidden />
            <span className="truncate">{actions.name(team)}</span>
          </Button>
        ))}
        <RoundToolsMenu game={game} scoring={scoring} send={send} direction="up" buttonClassName="w-full" />
        {[0, 1].map((team) => {
          const state = teamColumnState(game, team);
          return (
            <Button
              key={`bank-${team}`}
              id={`team${team}GivePointsButton`}
              variant={teamUi(team).solid}
              disabled={!state.canBank && !state.banked}
              aria-pressed={state.banked}
              className="min-w-0 flex-col gap-0 py-1 leading-tight"
              onClick={() => actions.bank(team)}
            >
              <span className="max-w-full truncate text-[11px] font-medium opacity-80">{actions.name(team)}</span>
              <span>
                {state.banked
                  ? t("Banked {{points}}", { points: state.bankedPoints })
                  : t("Bank {{points}}", { points: state.pot })}
              </span>
            </Button>
          );
        })}
        <Button id="nextRoundButton" variant="primary" onClick={flow.nextRound}>
          {t("Next Round")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `RoundsConsole`**

Create `src/components/Admin/Console/RoundsConsole.tsx`:

```tsx
import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { Button } from "@/components/ui/Button";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { Game, WSEvent } from "@/types/game";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import ActionBar from "./ActionBar";
import AnswerBoard from "./AnswerBoard";
import RoundHeader from "./RoundHeader";
import ScoreStrip from "./ScoreStrip";
import StealHint from "./StealHint";
import TeamColumn from "./TeamColumn";
import { FlowActions } from "./useFlowActions";

interface RoundsConsoleProps {
  game: Game;
  scoring: ScoringApi;
  flow: FlowActions;
  send: (data: WSEvent) => void;
}

/**
 * Desktop (>= 1024px): team columns flank the answers, mirroring the TV board.
 * Touch: score strip on top and a fixed bottom action bar.
 * Only one layout is mounted at a time so element ids stay unique.
 */
export default function RoundsConsole({ game, scoring, flow, send }: RoundsConsoleProps) {
  const { t } = useTranslation();
  const desktop = useMediaQuery("(min-width: 1024px)");
  if (!game.rounds[game.round]) return null;

  if (desktop) {
    return (
      <div className="mx-auto grid max-w-[1400px] grid-cols-[230px_minmax(0,1fr)_230px] items-start gap-4 px-5 py-4">
        <TeamColumn game={game} team={0} scoring={scoring} />
        <div className="flex min-w-0 flex-col gap-3">
          <StealHint game={game} />
          <RoundHeader game={game} scoring={scoring} flow={flow} send={send} showTools />
          <AnswerBoard game={game} scoring={scoring} />
          <div className="flex justify-end">
            <Button id="nextRoundButton" variant="primary" title={t("Clear strikes and move to the next round")} onClick={flow.nextRound}>
              {t("Next Round")}
              <ArrowRight size={16} aria-hidden />
            </Button>
          </div>
        </div>
        <TeamColumn game={game} team={1} scoring={scoring} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 px-3 pb-44 pt-3">
      <ScoreStrip game={game} />
      <StealHint game={game} />
      <RoundHeader game={game} scoring={scoring} flow={flow} send={send} showTools={false} />
      <AnswerBoard game={game} scoring={scoring} />
      <ActionBar game={game} scoring={scoring} flow={flow} send={send} />
    </div>
  );
}
```

- [ ] **Step 6: Format, lint, typecheck**

```bash
scripts/node-run.sh npx prettier --write src/components/Admin/Console
scripts/node-run.sh npx eslint src/components/Admin/Console
scripts/node-run.sh npx tsc --noEmit
```

Expected: no errors. If `tsc` reports a missing lucide icon (`Ellipsis`, `Undo2`, `Zap`, `Minus`), pick the nearest existing icon from `lucide-react` (for example `MoreHorizontal` for `Ellipsis`) and use it consistently.

- [ ] **Step 7: Commit**

```bash
git add Friendly-Feud/src/components/Admin/Console
git commit -m "feat(host): add Rounds screen with team columns (desktop) and action bar (touch)"
```

---

### Task 7: Fast Money, buzzers/players panel, and Hide-questions restyle

**Files:**
- Create: `src/components/Admin/Console/FastMoneyConsole.tsx`, `BuzzersPlayersPanel.tsx`
- Modify: `src/components/Admin/HideGameQuestions.tsx`

**Interfaces:**
- Consumes: `FinalRoundPointTotals`, `FinalRoundButtonControls`, `Players`, `BuzzerTable`, `Button`.
- Produces: `<FastMoneyConsole game setGame send timerStarted timerCompleted setTimerStarted setTimerCompleted />`, `<BuzzersPlayersPanel game setGame ws room send />`, restyled `HideGameQuestions` (same props, same id `hideQuestionsInput`).

- [ ] **Step 1: Create `FastMoneyConsole`**

This is the existing Fast Money JSX moved out of `GameDisplay/index.tsx` with **no behaviour change** (the legacy mutation pattern and `@ts-expect-error` comments are intentionally kept; they are cleaned up in plan 2). Create `src/components/Admin/Console/FastMoneyConsole.tsx`:

```tsx
import FinalRoundButtonControls from "@/components/Admin/GameDisplay/FinalRoundButtonControls";
import FinalRoundPointTotals from "@/components/Admin/GameDisplay/FinalRoundPointTotals";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface FastMoneyConsoleProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
  timerStarted: boolean;
  timerCompleted: boolean;
  setTimerStarted: (timerStarted: boolean) => void;
  setTimerCompleted: (timerCompleted: boolean) => void;
}

export default function FastMoneyConsole({
  game,
  setGame,
  send,
  timerStarted,
  timerCompleted,
  setTimerStarted,
  setTimerCompleted,
}: FastMoneyConsoleProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-[1400px] text-foreground">
      <div className="p-5">
        {/* FINAL ROUND TEXT */}
        <h2 id="finalRoundNumberText" className="py-3 text-center text-4xl text-foreground">
          {t("Final Round")} {t("number", { count: game.is_final_second ? 2 : 1 })}
        </h2>
        <hr />
        <div className="flex flex-row items-center justify-evenly space-x-5 py-5">
          {/* START FINAL ROUND 2 */}
          {!game.is_final_second ? (
            <button
              id="startFinalRound2Button"
              className={`rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500 ${timerStarted ? "opacity-50" : ""}`}
              disabled={timerStarted}
              onClick={() => {
                console.debug(game);
                game.is_final_second = true;
                game.hide_first_round = true;
                // @ts-expect-error: need a better way to update these values
                setGame((prv) => ({ ...prv }));
                send({ action: "data", data: game });
                send({
                  action: "set_timer",
                  data: game.final_round_timers[1],
                });
                setTimerCompleted(false);
              }}
            >
              {t("start")} {t("Final Round")} {t("number", { count: 2 })}
            </button>
          ) : (
            <div className="flex flex-row items-center justify-evenly space-x-5 py-5 text-foreground">
              {/* GO BACK TO FINAL ROUND 1 */}
              <button
                id="backToRound1FinalButton"
                className={`rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg hover:bg-secondary-500 ${timerStarted ? "opacity-50" : ""}`}
                disabled={timerStarted}
                onClick={() => {
                  game.is_final_round = true;
                  game.hide_first_round = false;
                  game.is_final_second = false;
                  // @ts-expect-error: need a better way to update these values
                  setGame((prv) => ({ ...prv }));
                  send({ action: "data", data: game });
                  send({
                    action: "set_timer",
                    data: game.final_round_timers[0],
                  });
                }}
              >
                {t("Back To")} {t("Final Round")} {t("number", { count: 1 })}
              </button>
              {game.is_final_second ? (
                <div>
                  {/* REVEAL FIRST ROUND ANSWERS */}
                  {game.hide_first_round ? (
                    <button
                      id="revealFirstRoundFinalButton"
                      className="rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500"
                      onClick={() => {
                        game.hide_first_round = false;
                        // @ts-expect-error: need a better way to update these values
                        setGame((prv) => ({ ...prv }));
                        send({ action: "data", data: game });
                      }}
                    >
                      {t("Reveal First Round Answers")}
                    </button>
                  ) : (
                    // HIDE FIRST ROUND ANSWERS
                    <button
                      id="hideFirstRoundAnswersButton"
                      className="rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500"
                      onClick={() => {
                        game.hide_first_round = true;
                        // @ts-expect-error: need a better way to update these values
                        setGame((prv) => ({ ...prv }));
                        send({ action: "data", data: game });
                      }}
                    >
                      {t("Hide First Round Answers")}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}
          <div className="flex px-2">
            {!timerStarted ? (
              /* START TIMER */
              <button
                id="startTimerButton"
                className={`rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500 ${timerCompleted ? "opacity-50" : ""}`}
                disabled={timerCompleted}
                onClick={() => {
                  if (game.is_final_second) {
                    send({
                      action: "start_timer",
                      data: game.final_round_timers[1],
                    });
                  } else {
                    send({
                      action: "start_timer",
                      data: game.final_round_timers[0],
                    });
                  }
                  setTimerStarted(true);
                  setTimerCompleted(false);
                }}
              >
                {t("Start Timer")}
              </button>
            ) : (
              /* STOP TIMER */
              <button
                id="stopTimerButton"
                className="rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500"
                onClick={() => {
                  send({ action: "stop_timer" });
                  setTimerStarted(false);
                }}
              >
                {t("Stop Timer")}
              </button>
            )}
            <button
              className={`ml-2 rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500 ${!timerStarted ? "" : "opacity-50"}`}
              disabled={timerStarted}
              id="resetTimerButton"
              onClick={() => {
                if (!timerStarted) {
                  if (game.is_final_second) {
                    send({
                      action: "set_timer",
                      data: game.final_round_timers[1],
                    });
                  } else {
                    send({
                      action: "set_timer",
                      data: game.final_round_timers[0],
                    });
                  }
                }
                setTimerCompleted(false);
              }}
            >
              {t("Reset Timer")}
            </button>
          </div>
        </div>
        <FinalRoundPointTotals game={game} />
        {/* FINAL ROUND QUESTIONS AND ANSWERS */}
        <FinalRoundButtonControls game={game} setGame={setGame} send={send} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `BuzzersPlayersPanel`**

Create `src/components/Admin/Console/BuzzersPlayersPanel.tsx`:

```tsx
import Players from "@/components/Admin/Players";
import BuzzerTable from "@/components/BuzzerTable";
import { Button } from "@/components/ui/Button";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, RefObject, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface BuzzersPlayersPanelProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  ws: RefObject<WebSocket>;
  room: string;
  send: (data: WSEvent) => void;
}

const HEADING = "mb-2 text-xs font-semibold uppercase tracking-widest text-pro-mute";

/** Content of the "Players & buzzers" drawer: buzz order plus the per-team player list. */
export default function BuzzersPlayersPanel({ game, setGame, ws, room, send }: BuzzersPlayersPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 text-foreground">
      <section>
        <h3 className={HEADING}>{t("Buzzer Order")}</h3>
        <div className="space-y-3 rounded-[12px] border border-pro-line bg-pro-panel p-3">
          {game.buzzed.length > 0 ? (
            <Button id="clearBuzzersButton" variant="danger" onClick={() => send({ action: "clearbuzzers" })}>
              {t("Clear Buzzers")}
            </Button>
          ) : (
            <Button id="clearBuzzersButtonDisabled" disabled>
              {t("Clear Buzzers")}
            </Button>
          )}
          <p className="text-xs text-pro-mute">{t("Changing rounds also clears buzzers")}</p>
          <BuzzerTable game={game} />
        </div>
      </section>
      <section>
        <h3 className={HEADING}>{t("players")}</h3>
        <Players game={game} setGame={setGame} ws={ws} room={room} />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Restyle `HideGameQuestions`**

Replace the whole of `src/components/Admin/HideGameQuestions.tsx` with:

```tsx
import { Button } from "@/components/ui/Button";
import { Game, WSEvent } from "@/types/game";
import { Eye, EyeOff } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface HideGameQuestionsProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
}

export default function HideGameQuestions({ game, setGame, send }: HideGameQuestionsProps) {
  const { t } = useTranslation();
  const hidden = game.settings.hide_questions;

  return (
    <Button
      id="hideQuestionsInput"
      aria-pressed={hidden}
      disabled={game.is_final_round}
      className="w-full justify-start"
      onClick={() => {
        setGame((prevGame) => {
          if (prevGame === null) {
            return prevGame;
          }

          const hideGame = !game.settings.hide_questions;

          const updatedGame = {
            ...prevGame,
            settings: {
              ...prevGame.settings,
              hide_questions: hideGame,
            },
          };

          send({ action: "data", data: updatedGame });

          return updatedGame;
        });
      }}
    >
      {hidden ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
      {hidden ? t("Show questions") : t("Hide questions")}
    </Button>
  );
}
```

- [ ] **Step 4: Format, lint, typecheck**

```bash
scripts/node-run.sh npx prettier --write src/components/Admin/Console src/components/Admin/HideGameQuestions.tsx
scripts/node-run.sh npx eslint src/components/Admin
scripts/node-run.sh npx tsc --noEmit
```

Expected: no errors. (The old `GameDisplay/index.tsx` still uses `HideGameQuestions` with unchanged props, so it still compiles.)

- [ ] **Step 5: Commit**

```bash
git add Friendly-Feud/src/components/Admin
git commit -m "feat(host): extract Fast Money and buzzers/players panels, restyle hide-questions"
```

---

### Task 8: Top bar, phase stepper, flow menu

**Files:**
- Create: `src/components/Admin/Console/PhaseStepper.tsx`, `FlowMenu.tsx`, `TopBar.tsx`

**Interfaces:**
- Consumes: `FlowActions`, `currentPhase`, `Menu`, `Button`, `buttonClass`, `ConfirmButton`, `HideGameQuestions`.
- Produces: `<TopBar game room flow setGame send quitGame settingsInline onOpenPlayers onOpenSettings />`. Ids: `roomCodeText`, `currentScreenText`, `openGameWindowButton`, `quitButton`, `flowMenuButton`, `playersDrawerButton`, `settingsDrawerButton`, `phaseLobbyButton`, `phaseRoundsButton`, `phaseFastMoneyButton`, plus (inside the open Flow menu) `roundSelector`, `hideQuestionsInput`, `titleCardButton`, `startRoundOneButton`, `finalRoundButton`.

- [ ] **Step 1: Create `PhaseStepper`**

Create `src/components/Admin/Console/PhaseStepper.tsx`:

```tsx
import ConfirmButton from "@/components/ui/ConfirmButton";
import { currentPhase, Phase } from "@/lib/host/console";
import { Game } from "@/types/game";
import { useTranslation } from "react-i18next";
import { FlowActions } from "./useFlowActions";

interface PhaseStepperProps {
  game: Game;
  flow: FlowActions;
}

const STEP =
  "inline-flex min-h-11 touch-manipulation items-center rounded-full px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold lg:min-h-9";
const ORDER: Phase[] = ["lobby", "rounds", "fastmoney"];

/** Lobby → Rounds n/N → Fast Money. Each step is also a shortcut to that phase. */
export default function PhaseStepper({ game, flow }: PhaseStepperProps) {
  const { t } = useTranslation();
  const phase = currentPhase(game);
  const currentIndex = ORDER.indexOf(phase);
  const stateClass = (index: number) =>
    index === currentIndex
      ? "bg-pro-accent text-white"
      : index < currentIndex
        ? "bg-pro-raised text-pro-ok"
        : "bg-pro-raised text-pro-mute hover:text-pro-text";
  const roundsLabel =
    phase === "rounds" ? `${t("Rounds")} · ${t("number", { count: game.round + 1 })}/${game.rounds.length}` : t("Rounds");

  return (
    <nav aria-label={t("Game phase")} className="flex items-center gap-1.5">
      <ConfirmButton
        id="phaseLobbyButton"
        aria-current={phase === "lobby" ? "step" : undefined}
        needsConfirm={!game.title && flow.inProgress}
        confirmLabel={t("Click again to confirm")}
        className={`${STEP} ${stateClass(0)}`}
        armedClassName={`${STEP} bg-pro-gold text-black`}
        onConfirm={() => {
          if (phase !== "lobby") flow.showTitle();
        }}
      >
        {currentIndex > 0 ? "✓ " : ""}
        {t("Lobby")}
      </ConfirmButton>
      <button
        type="button"
        id="phaseRoundsButton"
        aria-current={phase === "rounds" ? "step" : undefined}
        className={`${STEP} ${stateClass(1)}`}
        onClick={() => {
          if (phase !== "rounds") flow.goToRound(game.round);
        }}
      >
        {currentIndex > 1 ? "✓ " : ""}
        {roundsLabel}
      </button>
      <button
        type="button"
        id="phaseFastMoneyButton"
        aria-current={phase === "fastmoney" ? "step" : undefined}
        disabled={game.final_round == null}
        className={`${STEP} ${stateClass(2)} disabled:opacity-40`}
        onClick={() => {
          if (phase !== "fastmoney") flow.goFinal();
        }}
      >
        {t("Fast Money")}
      </button>
    </nav>
  );
}
```

- [ ] **Step 2: Create `FlowMenu`**

Create `src/components/Admin/Console/FlowMenu.tsx`:

```tsx
import HideGameQuestions from "@/components/Admin/HideGameQuestions";
import { Button, buttonClass } from "@/components/ui/Button";
import ConfirmButton from "@/components/ui/ConfirmButton";
import Menu from "@/components/ui/Menu";
import { Game, WSEvent } from "@/types/game";
import { SlidersHorizontal } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { FlowActions } from "./useFlowActions";

interface FlowMenuProps {
  game: Game;
  flow: FlowActions;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
}

const ITEM = "w-full justify-start";
const ARMED = buttonClass("secondary", `${ITEM} border-pro-gold text-pro-gold ring-2 ring-pro-gold`);
const SELECT =
  "mt-1 min-h-11 w-full rounded-[10px] border border-pro-line bg-pro-raised px-3 text-sm text-pro-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold";

/** Everything that changes where the game is, tucked into one menu instead of a row of buttons. */
export default function FlowMenu({ game, flow, setGame, send }: FlowMenuProps) {
  const { t } = useTranslation();

  return (
    <Menu
      buttonId="flowMenuButton"
      ariaLabel={t("Game flow")}
      label={
        <>
          <SlidersHorizontal size={16} aria-hidden />
          <span className="hidden md:inline">{t("Flow")}</span>
        </>
      }
      panelClassName="w-72 space-y-3"
    >
      {({ close }) => (
        <>
          <label className="block text-xs text-pro-mute">
            {t("Jump to round")}
            <select
              id="roundSelector"
              aria-label={t("round")}
              title={t("Jump to a specific round")}
              className={SELECT}
              value={game.round}
              onChange={(e) => {
                flow.goToRound(parseInt(e.target.value, 10));
                close();
              }}
            >
              {game.rounds.map((_, index) => (
                <option value={index} key={`round-select-${index}`}>
                  {t("round")} {t("number", { count: index + 1 })}
                </option>
              ))}
            </select>
          </label>
          <HideGameQuestions game={game} setGame={setGame} send={send} />
          <ConfirmButton
            id="titleCardButton"
            className={buttonClass("secondary", ITEM)}
            armedClassName={ARMED}
            title={t("Show the title screen on the TV (starts a fresh game)")}
            needsConfirm={!game.title && flow.inProgress}
            confirmLabel={t("Click again to confirm")}
            onConfirm={() => {
              flow.showTitle();
              close();
            }}
          >
            {t("Title Card")}
          </ConfirmButton>
          {!game.title && (
            <ConfirmButton
              id="startRoundOneButton"
              className={buttonClass("secondary", ITEM)}
              armedClassName={ARMED}
              title={t("Put the board live and start scoring round 1")}
              needsConfirm={flow.startNeedsConfirm}
              confirmLabel={t("Click again to confirm")}
              onConfirm={() => {
                flow.startRoundOne();
                close();
              }}
            >
              {t("Restart from Round 1")}
            </ConfirmButton>
          )}
          {game.final_round != null && (
            <Button
              id="finalRoundButton"
              className={ITEM}
              title={t("Switch to the Fast Money round")}
              onClick={() => {
                flow.goFinal();
                close();
              }}
            >
              {t("Final Round")}
            </Button>
          )}
        </>
      )}
    </Menu>
  );
}
```

- [ ] **Step 3: Create `TopBar`**

Create `src/components/Admin/Console/TopBar.tsx`:

```tsx
import { Button, buttonClass } from "@/components/ui/Button";
import { defaultLanguage } from "@/i18n/languages";
import { Game, WSEvent } from "@/types/game";
import { CircleHelp, LogOut, Monitor, Settings, Users } from "lucide-react";
import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import FlowMenu from "./FlowMenu";
import PhaseStepper from "./PhaseStepper";
import { FlowActions } from "./useFlowActions";

interface TopBarProps {
  game: Game;
  room: string;
  flow: FlowActions;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
  quitGame: (host: boolean) => void;
  /** Settings are shown inline (lobby / no game), so the settings drawer button is hidden. */
  settingsInline: boolean;
  onOpenPlayers: () => void;
  onOpenSettings: () => void;
}

export default function TopBar({
  game,
  room,
  flow,
  setGame,
  send,
  quitGame,
  settingsInline,
  onOpenPlayers,
  onOpenSettings,
}: TopBarProps) {
  const { t } = useTranslation();
  const hasGame = game.rounds != null;
  const buzzCount = game.buzzed?.length ?? 0;

  let currentScreen = t("title");
  if (!game.title) {
    if (!game.is_final_round) currentScreen = `${t("round")} ${t("number", { count: game.round + 1 })}`;
    else if (!game.is_final_second) currentScreen = `${t("Final Round")} ${t("number", { count: 1 })}`;
    else currentScreen = `${t("Final Round")} ${t("number", { count: 2 })}`;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-pro-line bg-pro-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-3 py-2 sm:px-5">
        <span
          id="roomCodeText"
          title={t("room code")}
          className="rounded-[10px] border border-pro-line bg-pro-panel px-3 py-1 text-lg font-extrabold uppercase tracking-[0.2em]"
        >
          {room}
        </span>
        {hasGame && <PhaseStepper game={game} flow={flow} />}
        {hasGame && (
          <p id="currentScreenText" className="sr-only">
            {t("Current Screen")}: {currentScreen}
          </p>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {hasGame && <FlowMenu game={game} flow={flow} setGame={setGame} send={send} />}
          <Button id="playersDrawerButton" aria-label={t("Players & buzzers")} className="relative" onClick={onOpenPlayers}>
            <Users size={16} aria-hidden />
            <span className="hidden md:inline">{t("players")}</span>
            {buzzCount > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-pro-gold text-[11px] font-bold text-black">
                {buzzCount}
              </span>
            )}
          </Button>
          {!settingsInline && (
            <Button id="settingsDrawerButton" aria-label={t("Settings")} onClick={onOpenSettings}>
              <Settings size={16} aria-hidden />
              <span className="hidden md:inline">{t("Settings")}</span>
            </Button>
          )}
          <Link id="openGameWindowButton" href="/game" target="_blank" className={buttonClass("secondary")}>
            <Monitor size={16} aria-hidden />
            <span className="hidden md:inline">{t("Open Game Window")}</span>
          </Link>
          <Link
            href={`/docs/${defaultLanguage}/guide`}
            target="_blank"
            aria-label={t("help")}
            className={buttonClass("ghost", "px-3")}
          >
            <CircleHelp size={16} aria-hidden />
          </Link>
          <Button id="quitButton" variant="danger" aria-label={t("Quit")} onClick={() => quitGame(true)}>
            <LogOut size={16} aria-hidden />
            <span className="hidden md:inline">{t("Quit")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Format, lint, typecheck**

```bash
scripts/node-run.sh npx prettier --write src/components/Admin/Console
scripts/node-run.sh npx eslint src/components/Admin/Console
scripts/node-run.sh npx tsc --noEmit
```

Expected: no errors. (`@/i18n/languages` exports `defaultLanguage`; it is already imported that way by `Lobby.tsx`.)

- [ ] **Step 5: Commit**

```bash
git add Friendly-Feud/src/components/Admin/Console
git commit -m "feat(host): add top bar, phase stepper and flow menu"
```

---

### Task 9: Wire it together (phase router, admin page, drawers, i18n)

**Files:**
- Create: `src/components/Admin/Console/SettingsPanel.tsx`, `scripts/i18n-merge.mjs`, `scripts/i18n/host-console.en.json`, `scripts/i18n/host-console.et.json`
- Modify: `src/components/Admin/GameDisplay/index.tsx` (full rewrite), `src/components/Admin/RoomSettings.tsx` (full rewrite), `src/components/AdminPage.tsx` (full rewrite), `public/locales/en/translation.json`, `public/locales/et/translation.json`
- Delete: `src/components/Admin/GameDisplay/ScoreBar.tsx`, `TeamControls.tsx`, `AnswerGrid.tsx`, `PhaseBar.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2-8.
- Produces: the finished host console at `/` (admin view).

- [ ] **Step 1: Simplify `RoomSettings` to the setup block**

Replace the whole of `src/components/Admin/RoomSettings.tsx` with:

```tsx
import GameLoader from "@/components/Admin/GameLoader";
import ThemeSwitcher from "@/components/Admin/ThemeSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { normalizeLanguage } from "@/i18n/languages";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface RoomSettingsProps {
  game: Game;
  gameSelector: string[];
  send: (data: WSEvent) => void;
  setGame: Dispatch<SetStateAction<Game | null>>;
  setCsvFileUpload: Dispatch<SetStateAction<File | null>>;
  setCsvFileUploadText: Dispatch<SetStateAction<string>>;
}

/** Language, board theme and the game loader. */
export default function RoomSettings({
  game,
  gameSelector,
  send,
  setGame,
  setCsvFileUpload,
  setCsvFileUploadText,
}: RoomSettingsProps) {
  const { i18n } = useTranslation();

  return (
    <div className="flex flex-col items-start gap-5 text-foreground md:flex-row md:justify-between">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <LanguageSwitcher
          onChange={(e) => {
            const language = normalizeLanguage(e.target.value);
            i18n.changeLanguage(language);
            send({ action: "change_lang", data: language });
          }}
        />
        <ThemeSwitcher game={game} setGame={setGame} send={send} />
      </div>
      <GameLoader
        gameSelector={gameSelector}
        send={send}
        setCsvFileUpload={setCsvFileUpload}
        setCsvFileUploadText={setCsvFileUploadText}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `SettingsPanel`**

Create `src/components/Admin/Console/SettingsPanel.tsx`:

```tsx
import AdminSettings from "@/components/Admin/AdminSettings";
import CreateNewGameButton from "@/components/Admin/CreateNewGameButton";
import RoomSettings from "@/components/Admin/RoomSettings";
import TitlesAndLogoSettings from "@/components/Admin/TitlesAndLogoSettings";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, SetStateAction } from "react";

interface SettingsPanelProps {
  game: Game;
  room: string;
  gameSelector: string[];
  hostPassword: string;
  send: (data: WSEvent) => void;
  setGame: Dispatch<SetStateAction<Game | null>>;
  setCsvFileUpload: Dispatch<SetStateAction<File | null>>;
  setCsvFileUploadText: Dispatch<SetStateAction<string>>;
  imageUploaded: File | null;
  setImageUploaded: Dispatch<SetStateAction<File | null>>;
}

/**
 * All setup controls in one stack. Shown inline in the lobby (and when no game is loaded) and inside the
 * Settings drawer during play. The interiors are still legacy-styled; they are restyled in plan 2.
 */
export default function SettingsPanel({
  game,
  room,
  gameSelector,
  hostPassword,
  send,
  setGame,
  setCsvFileUpload,
  setCsvFileUploadText,
  imageUploaded,
  setImageUploaded,
}: SettingsPanelProps) {
  return (
    <div className="space-y-8 text-foreground">
      <RoomSettings
        game={game}
        gameSelector={gameSelector}
        send={send}
        setGame={setGame}
        setCsvFileUpload={setCsvFileUpload}
        setCsvFileUploadText={setCsvFileUploadText}
      />
      <CreateNewGameButton />
      <hr />
      <TitlesAndLogoSettings
        game={game}
        send={send}
        room={room}
        setGame={setGame}
        setImageUploaded={setImageUploaded}
        imageUploaded={imageUploaded}
      />
      <hr />
      <AdminSettings game={game} setGame={setGame} send={send} hostPassword={hostPassword} />
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `GameDisplay/index.tsx` as the phase router**

Replace the whole of `src/components/Admin/GameDisplay/index.tsx` with:

```tsx
import FastMoneyConsole from "@/components/Admin/Console/FastMoneyConsole";
import RoundsConsole from "@/components/Admin/Console/RoundsConsole";
import { FlowActions } from "@/components/Admin/Console/useFlowActions";
import Lobby from "@/components/Admin/GameDisplay/Lobby";
import TitleMusic from "@/components/Admin/GameDisplay/TitleMusic";
import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { buttonClass } from "@/components/ui/Button";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { currentPhase } from "@/lib/host/console";
import { toggleAnswer } from "@/lib/scoring";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, ReactNode, SetStateAction, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface GameDisplayProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  room: string;
  send: (data: WSEvent) => void;
  scoring: ScoringApi;
  flow: FlowActions;
  timerStarted: boolean;
  timerCompleted: boolean;
  setTimerStarted: (timerStarted: boolean) => void;
  setTimerCompleted: (timerCompleted: boolean) => void;
  titleMusicPlaying: boolean;
  setTitleMusicPlaying: (titleMusicPlaying: boolean) => void;
  /** Setup controls; rendered inline in the lobby and when no game is loaded. */
  settingsPanel: ReactNode;
}

/** Chooses what the host sees for the current phase: Lobby, Rounds or Fast Money. */
export default function GameDisplay({
  game,
  setGame,
  room,
  send,
  scoring,
  flow,
  timerStarted,
  timerCompleted,
  setTimerStarted,
  setTimerCompleted,
  titleMusicPlaying,
  setTitleMusicPlaying,
  settingsPanel,
}: GameDisplayProps) {
  const { t } = useTranslation();

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, 1-8 = toggle answer. Ignored while typing or while a drawer is open.
  const shortcutState = useRef({ game, scoring, t });
  shortcutState.current = { game, scoring, t };
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const { game: g, scoring: sc, t: tr } = shortcutState.current;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        sc.undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || g.title || g.is_final_round || !g.rounds) return;
      const index = parseInt(e.key, 10) - 1;
      const answer = g.rounds[g.round]?.answers[index];
      if (index < 0 || index > 7 || !answer) return;
      e.preventDefault();
      const { game: next, revealed } = toggleAnswer(g, index);
      sc.commit(
        next,
        revealed ? tr("Revealed {{answer}}", { answer: answer.ans }) : tr("Hid {{answer}}", { answer: answer.ans }),
        revealed ? [{ action: "reveal" }] : []
      );
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (game.rounds == null) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        <p className="text-center text-xl text-pro-mute">[{t("Please load a game")}]</p>
        <section className="rounded-[14px] border border-pro-line bg-pro-panel p-4">{settingsPanel}</section>
      </div>
    );
  }

  const phase = currentPhase(game);

  if (phase === "lobby") {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmButton
            id="startRoundOneButton"
            className={buttonClass("primary", "min-h-12 px-6 text-base")}
            armedClassName={buttonClass("secondary", "min-h-12 px-6 text-base border-pro-gold text-pro-gold ring-2 ring-pro-gold")}
            title={t("Put the board live and start scoring round 1")}
            needsConfirm={flow.startNeedsConfirm}
            confirmLabel={t("Click again to confirm")}
            onConfirm={flow.startRoundOne}
          >
            ▶ {t("Start Round 1")}
          </ConfirmButton>
          {(game.title || titleMusicPlaying) && (
            <div className="text-foreground">
              <TitleMusic
                send={send}
                room={room}
                game={game}
                setGame={setGame}
                isPlaying={titleMusicPlaying}
                setIsPlaying={setTitleMusicPlaying}
              />
            </div>
          )}
        </div>
        <p className="text-sm text-pro-mute">{t("Players join with the code below, then press Start Round 1.")}</p>
        <Lobby game={game} room={room} />
        <section className="rounded-[14px] border border-pro-line bg-pro-panel p-4">
          <h2 className="mb-4 text-base font-semibold">{t("Titles, teams & settings")}</h2>
          {settingsPanel}
        </section>
      </div>
    );
  }

  if (phase === "fastmoney") {
    return (
      <FastMoneyConsole
        game={game}
        setGame={setGame}
        send={send}
        timerStarted={timerStarted}
        timerCompleted={timerCompleted}
        setTimerStarted={setTimerStarted}
        setTimerCompleted={setTimerCompleted}
      />
    );
  }

  return <RoundsConsole game={game} scoring={scoring} flow={flow} send={send} />;
}
```

- [ ] **Step 4: Rewrite `AdminPage.tsx`**

Replace the whole of `src/components/AdminPage.tsx` with:

```tsx
import BuzzersPlayersPanel from "@/components/Admin/Console/BuzzersPlayersPanel";
import SettingsPanel from "@/components/Admin/Console/SettingsPanel";
import TopBar from "@/components/Admin/Console/TopBar";
import { useFlowActions } from "@/components/Admin/Console/useFlowActions";
import CSVLoader from "@/components/Admin/CSVLoader";
import GameDisplay from "@/components/Admin/GameDisplay";
import { useScoring } from "@/components/Admin/GameDisplay/useScoring";
import Drawer from "@/components/ui/Drawer";
import { ERROR_CODES } from "@/i18n/errorCodes";
import { normalizeLanguage } from "@/i18n/languages";
import { Game, WSAction, WSEvent } from "@/types/game";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { GameContext } from "../pages";

interface AdminPageProps {
  ws: React.RefObject<WebSocket>;
  game: Game;
  setGame: React.Dispatch<React.SetStateAction<Game | null>>;
  room: string;
  quitGame: () => void;
  playerId: string | null;
  hostPassword: string;
}

export default function AdminPage({ ws, game, setGame, room, quitGame, playerId }: AdminPageProps) {
  const { i18n, t } = useTranslation();

  const { hostPassword } = useContext(GameContext);

  const [gameSelector, setGameSelector] = useState<string[]>([]);
  const [imageUploaded, setImageUploaded] = useState<File | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const [titleMusicPlaying, setTitleMusicPlaying] = useState(false);
  const [csvFileUpload, setCsvFileUpload] = useState<File | null>(null);
  const [csvFileUploadText, setCsvFileUploadText] = useState("");
  const [drawer, setDrawer] = useState<"players" | "settings" | null>(null);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const refreshCounterRef = useRef(0);

  // Setup controls are shown inline in the lobby (and when no game is loaded); during play they live in a drawer.
  const settingsInline = game.rounds == null || game.title;
  useEffect(() => {
    if (settingsInline) setDrawer((current) => (current === "settings" ? null : current));
  }, [settingsInline]);

  function send(data: WSEvent) {
    console.debug("Sending", data);
    ws.current.send(JSON.stringify({ ...data, room, id: playerId, hostPassword: hostPassword }));
  }

  const scoring = useScoring(game, setGame, send);
  const flow = useFlowActions(game, scoring);

  const handleMessage = (evt: MessageEvent) => {
    const received_msg = evt.data;
    const json: WSEvent = JSON.parse(received_msg);
    if (json.action === "data") {
      setGame(json.data);
    } else if (json.action === "change_lang") {
      console.debug("Language Change", json.data);
      if (json.games != null) {
        setGameSelector(json.games);
      } else {
        setGameSelector([]);
      }
    } else if (json.action === "error" && json.code) {
      console.error(json.code);
      toast.error(t(json.code, { message: json.message }));
    } else if (json.action === WSAction.PLAY_TITLE_MUSIC) {
      setTitleMusicPlaying(true);
    } else if (json.action === WSAction.PAUSE_TITLE_MUSIC) {
      setTitleMusicPlaying(false);
    } else if (json.action === WSAction.TITLE_MUSIC_PLAYBACK_ERROR) {
      setTitleMusicPlaying(false);
      toast.error(t(ERROR_CODES.TITLE_MUSIC_PLAYBACK_ERROR));
    } else if (json.action === "timer_complete") {
      setTimerStarted(false);
      setTimerCompleted(true);
    } else {
      console.debug("did not expect admin: ", json);
    }
  };

  useEffect(() => {
    const retryInterval = setInterval(() => {
      if (ws.current.readyState !== 1) {
        refreshCounterRef.current++;
        const remainingSeconds = Math.max(0, 5 - refreshCounterRef.current);
        toast.error(t(ERROR_CODES.CONNECTION_LOST, { message: `${remainingSeconds}` }));
        if (refreshCounterRef.current >= 5) {
          console.debug("admin reload()");
          clearInterval(retryInterval);
          location.reload();
        }
      } else {
        refreshCounterRef.current = 0;
      }
    }, 1000);

    ws.current.addEventListener("message", handleMessage);
    send({ action: "change_lang", data: normalizeLanguage(i18n.resolvedLanguage ?? i18n.language) });
    return () => {
      clearInterval(retryInterval);
      ws.current.removeEventListener("message", handleMessage);
    };
  }, [i18n.language]);

  if (game.teams == null) {
    return (
      <div>
        <p>{t("loading")}</p>
      </div>
    );
  }

  const settingsPanel = (
    <SettingsPanel
      game={game}
      room={room}
      gameSelector={gameSelector}
      hostPassword={hostPassword}
      send={send}
      setGame={setGame}
      setCsvFileUpload={setCsvFileUpload}
      setCsvFileUploadText={setCsvFileUploadText}
      imageUploaded={imageUploaded}
      setImageUploaded={setImageUploaded}
    />
  );

  return (
    // `darkTheme` makes the legacy themed components inside render on the dark palette.
    <div className="darkTheme min-h-screen bg-pro-bg font-pro text-pro-text">
      <TopBar
        game={game}
        room={room}
        flow={flow}
        setGame={setGame}
        send={send}
        quitGame={quitGame}
        settingsInline={settingsInline}
        onOpenPlayers={() => setDrawer("players")}
        onOpenSettings={() => setDrawer("settings")}
      />
      <GameDisplay
        game={game}
        setGame={setGame}
        room={room}
        send={send}
        scoring={scoring}
        flow={flow}
        timerStarted={timerStarted}
        timerCompleted={timerCompleted}
        setTimerStarted={setTimerStarted}
        setTimerCompleted={setTimerCompleted}
        titleMusicPlaying={titleMusicPlaying}
        setTitleMusicPlaying={setTitleMusicPlaying}
        settingsPanel={settingsPanel}
      />
      <Drawer id="playersDrawer" open={drawer === "players"} title={t("Players & buzzers")} onClose={closeDrawer}>
        <BuzzersPlayersPanel game={game} setGame={setGame} ws={ws} room={room} send={send} />
      </Drawer>
      {!settingsInline && (
        <Drawer id="settingsDrawer" open={drawer === "settings"} title={t("Settings")} onClose={closeDrawer}>
          {settingsPanel}
        </Drawer>
      )}
      {/* Modal over whole admin page */}
      {csvFileUpload && (
        <CSVLoader
          csvFileUpload={csvFileUpload}
          setCsvFileUpload={setCsvFileUpload}
          csvFileUploadText={csvFileUploadText}
          send={send}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Delete the replaced components**

```bash
git rm Friendly-Feud/src/components/Admin/GameDisplay/ScoreBar.tsx \
       Friendly-Feud/src/components/Admin/GameDisplay/TeamControls.tsx \
       Friendly-Feud/src/components/Admin/GameDisplay/AnswerGrid.tsx \
       Friendly-Feud/src/components/Admin/GameDisplay/PhaseBar.tsx
```

- [ ] **Step 6: Add the translation merge script and strings**

Create `scripts/i18n-merge.mjs`:

```js
// Add missing keys to a locale file without touching existing ones.
// Usage: node scripts/i18n-merge.mjs <lang> <path-to-json-with-new-keys>
import { readFileSync, writeFileSync } from "node:fs";

const [lang, incomingPath] = process.argv.slice(2);
if (!lang || !incomingPath) {
  console.error("usage: node scripts/i18n-merge.mjs <lang> <incoming.json>");
  process.exit(1);
}
const file = new URL(`../public/locales/${lang}/translation.json`, import.meta.url);
const current = JSON.parse(readFileSync(file, "utf8"));
const incoming = JSON.parse(readFileSync(incomingPath, "utf8"));
let added = 0;
for (const [key, value] of Object.entries(incoming)) {
  if (!(key in current)) {
    current[key] = value;
    added++;
  }
}
writeFileSync(file, JSON.stringify(current, null, 2) + "\n");
console.log(`${lang}: added ${added} key(s)`);
```

Create `scripts/i18n/host-console.en.json`:

```json
{
  "Flow": "Flow",
  "Game flow": "Game flow",
  "Players & buzzers": "Players & buzzers",
  "Settings": "Settings",
  "Close": "Close",
  "Strike": "Strike",
  "Bank {{points}}": "Bank {{points}}",
  "Banked {{points}}": "Banked {{points}}",
  "Remove a strike": "Remove a strike",
  "Jump to round": "Jump to round",
  "Restart from Round 1": "Restart from Round 1",
  "Round tools": "Round tools",
  "Buzzed first: {{team}}": "Buzzed first: {{team}}"
}
```

Create `scripts/i18n/host-console.et.json`:

```json
{
  "Flow": "Menüü",
  "Game flow": "Mängu kulg",
  "Players & buzzers": "Mängijad ja märguanded",
  "Settings": "Seaded",
  "Close": "Sulge",
  "Strike": "Viga",
  "Bank {{points}}": "Anna {{points}}",
  "Banked {{points}}": "Antud {{points}}",
  "Remove a strike": "Eemalda viga",
  "Jump to round": "Hüppa vooru",
  "Restart from Round 1": "Alusta uuesti vooru 1",
  "Round tools": "Vooru tööriistad",
  "Buzzed first: {{team}}": "Esimesena märguande andis: {{team}}"
}
```

Run:

```bash
scripts/node-run.sh node scripts/i18n-merge.mjs en scripts/i18n/host-console.en.json
scripts/node-run.sh node scripts/i18n-merge.mjs et scripts/i18n/host-console.et.json
git diff --stat public/locales
```

Expected: `en: added N key(s)` and `et: added N key(s)` with N between 1 and 13 (existing keys are skipped), and the diff only appends lines (no reformatting of existing entries). If the diff shows large unrelated reformatting, revert both locale files (`git checkout public/locales`) and instead add the missing keys by hand just before the closing `}` of each file.

- [ ] **Step 7: Format, lint, typecheck, unit tests**

```bash
scripts/node-run.sh npx prettier --write src/components/Admin src/components/AdminPage.tsx
scripts/node-run.sh npx eslint src
scripts/node-run.sh npx tsc --noEmit
scripts/node-run.sh npx vitest run
```

Expected: all four pass. Fix any unused-import or type errors reported (for example an import left over from the old `GameDisplay`).

- [ ] **Step 8: Visual verification in the live dev stack**

The dev stack hot-reloads, so it should already show the new UI at `http://127.0.0.1:8082`. If the container did not pick up the deleted/renamed files, restart it: `make local-dev-down && make local-dev docker_registry=local`.

Using the browser tools, check each item and take a screenshot as evidence:

1. Open `http://127.0.0.1:8082/`, click **host**. Expect the dark top bar with the room code, a three-step stepper (Lobby active), a Flow menu, Players, Open Game Window and Quit. Below it: a **Start Round 1** primary button, the join code and roster, and the inline settings (game loader, team names, etc.) on the dark surface. Legacy inputs must be readable (light text on dark). If any legacy component renders dark text on a dark background, note it for plan 2 but do not fix it here unless it blocks use.
2. Pick the first game in `#gameSelector`, click **Start Round 1**. Expect three columns at 1440 wide: Alpha column left, round header and answer tiles centre, Bravo column right. Stepper shows `Rounds · 1/N`.
3. Press key `1`: the first tile turns green with a check, the pot updates. Click **Strike** on Alpha twice: two red ✕ pips. Click **Bank** on Alpha: the button reads "Banked N", both Bank buttons lock, and the header says "Banked by Team Alpha".
4. Press `Ctrl+Z` three times: bank, strikes and reveal undo in order.
5. Click **Flow**: menu shows Jump to round, Hide/Show questions, Title Card, Restart from Round 1, Final Round. Press `Esc`: it closes.
6. Click **Players** icon: a right drawer opens with Buzzer Order and Players. `Esc` closes it.
7. Resize to a phone viewport with CDP and screenshot:
   `Emulation.setDeviceMetricsOverride {"width":390,"height":844,"deviceScaleFactor":2,"mobile":true}`. Expect the score strip on top, the round header, answer tiles, and a fixed bottom bar (Strike A, Strike B, ⋯, Bank A, Bank B, Next Round). Tap targets look at least 44px tall. Then send `Emulation.clearDeviceMetricsOverride`.
8. Click **Quit** only at the very end of the check.

- [ ] **Step 9: Commit**

```bash
git add Friendly-Feud
git commit -m "feat(host): wire the new console frame, phase router, drawers and translations"
```

---

### Task 10: Update the Playwright suite

**Files:**
- Create: `scripts/e2e-run.sh`
- Modify: `e2e/tests/models/AdminPage.ts`, `e2e/tests/admin/admin.spec.ts`, `e2e/tests/admin/points-mistakes.spec.ts`, `e2e/tests/admin/settings.spec.ts`, `e2e/tests/buzzer.spec.ts`, `e2e/tests/host-buzzers.spec.ts`

**Interfaces:**
- Produces: AdminPage model helpers `openFlowMenu()`, `openRoundTools()`, `openPlayers()`, `openSettings()`, `closeDrawer()`.

- [ ] **Step 1: Create the e2e runner**

Create `scripts/e2e-run.sh`:

```bash
#!/usr/bin/env bash
# Run the Playwright suite in the official Playwright image against the live-reload dev stack
# (start it first with: make local-dev docker_registry=local).
# Usage: scripts/e2e-run.sh [playwright args, e.g. tests/buzzer.spec.ts]
set -euo pipefail
cd "$(dirname "$0")/.."

UID_GID="$(id -u):$(id -g)"
VOLUME=famf_node_modules_pw
BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:8082}"

if ! docker volume inspect "$VOLUME" >/dev/null 2>&1; then
  docker volume create "$VOLUME" >/dev/null
  docker run --rm -v "$VOLUME":/m alpine chown "$UID_GID" /m
fi

exec docker run --rm --network host --ipc=host \
  --user "$UID_GID" \
  -e HOME=/tmp \
  -e npm_config_cache=/tmp/.npm \
  -e PLAYWRIGHT_BASE_URL="$BASE_URL" \
  -v "$PWD":/app \
  -v "$VOLUME":/app/node_modules \
  -w /app \
  mcr.microsoft.com/playwright:v1.57.0-noble \
  sh -c 'if [ ! -f node_modules/.package-lock.json ]; then npm ci --ignore-scripts --no-audit --no-fund; fi; cd e2e && exec npx playwright test --config playwright.config.ts "$@"' sh "$@"
```

```bash
chmod +x scripts/e2e-run.sh
```

- [ ] **Step 2: Add helpers to the AdminPage model**

In `e2e/tests/models/AdminPage.ts`:

(a) add these members to the class field list (next to `hostPassword: Locator;`):

```ts
  flowMenuButton: Locator;
  roundToolsButton: Locator;
  playersDrawerButton: Locator;
  settingsDrawerButton: Locator;
  playersDrawer: Locator;
  settingsDrawer: Locator;
```

(b) add these assignments at the end of the constructor (after `this.hostPassword = ...`):

```ts
    this.flowMenuButton = page.getByTestId("flowMenuButton");
    this.roundToolsButton = page.getByTestId("roundToolsButton");
    this.playersDrawerButton = page.getByTestId("playersDrawerButton");
    this.settingsDrawerButton = page.getByTestId("settingsDrawerButton");
    this.playersDrawer = page.getByTestId("playersDrawer");
    this.settingsDrawer = page.getByTestId("settingsDrawer");
```

(c) add these methods after the constructor, inside the class:

```ts
  /** Open the Flow menu (round selector, hide questions, title card, restart, final round). Idempotent. */
  async openFlowMenu() {
    if ((await this.flowMenuButton.getAttribute("aria-expanded")) !== "true") {
      await this.flowMenuButton.click();
    }
  }

  /** Open the round tools menu (remove strike, reset strikes, flash X, manual adjust). Idempotent. */
  async openRoundTools() {
    if ((await this.roundToolsButton.getAttribute("aria-expanded")) !== "true") {
      await this.roundToolsButton.click();
    }
  }

  /** Open the Players & buzzers drawer (buzz order, clear buzzers, per-player controls). Idempotent. */
  async openPlayers() {
    if (!(await this.playersDrawer.isVisible())) {
      await this.playersDrawerButton.click();
    }
  }

  /** Make the setup controls reachable: inline in the lobby, otherwise via the Settings drawer. */
  async openSettings() {
    if (await this.gameSelector.isVisible()) return;
    if (!(await this.settingsDrawer.isVisible())) {
      await this.settingsDrawerButton.click();
    }
  }

  async closeDrawer() {
    await this.page.keyboard.press("Escape");
  }
```

- [ ] **Step 3: Update `admin.spec.ts`**

(a) In "can select final round answers", change

```ts
  await adminPage.startRoundOneButton.click();
  const buzzerPage = new BuzzerPage(player.page);
  await adminPage.finalRound.button.click();
```

to

```ts
  await adminPage.startRoundOneButton.click();
  const buzzerPage = new BuzzerPage(player.page);
  await adminPage.openFlowMenu();
  await adminPage.finalRound.button.click();
```

(b) In "can hide game board from player", change

```ts
  await adminPage.players.hideGameButtons.team1[0].click({ timeout: 2000 });
```

to

```ts
  await adminPage.openPlayers();
  await adminPage.players.hideGameButtons.team1[0].click({ timeout: 2000 });
```

(c) In "can answer final round questions", change

```ts
  await adminPage.gameSelector.selectOption({ index: 1 });
  await adminPage.finalRound.button.click();
```

to

```ts
  await adminPage.gameSelector.selectOption({ index: 1 });
  await adminPage.openFlowMenu();
  await adminPage.finalRound.button.click();
```

(d) In `e2e/tests/admin/timer-controls.spec.ts` (line 25) change

```ts
  await adminPage.finalRound.button.click();
```

to

```ts
  await adminPage.openFlowMenu();
  await adminPage.finalRound.button.click();
```

Also add `e2e/tests/admin/timer-controls.spec.ts` to this task's **Modify** list.

- [ ] **Step 4: Update `points-mistakes.spec.ts`**

In "can track points between rounds" change

```ts
  await adminPage.roundSelector.selectOption({ index: 0 });
```

to

```ts
  await adminPage.openFlowMenu();
  await adminPage.roundSelector.selectOption({ index: 0 });
```

- [ ] **Step 5: Update `settings.spec.ts`**

In "can hide questions" change

```ts
  await adminPage.startRoundOneButton.click();
  await adminPage.hideQuestionsInput.click();
```

to

```ts
  await adminPage.startRoundOneButton.click();
  await adminPage.openFlowMenu();
  await adminPage.hideQuestionsInput.click();
```

- [ ] **Step 6: Update `buzzer.spec.ts`**

In "can use buzzers" insert `await adminPage.openPlayers();` immediately after `await adminPage.startRoundOneButton.click();`, so the block reads:

```ts
  await adminPage.gameSelector.selectOption({ index: 1 });
  await adminPage.startRoundOneButton.click();
  await adminPage.openPlayers();

  await buzzerPage1.buzzerButton.click();
```

(The drawer stays open for the clear-buzzers and player-quit steps, which are all inside it.)

- [ ] **Step 7: Update `host-buzzers.spec.ts`**

(a) In `beforeAll`, read the host password in the lobby (settings are inline there) by moving the two lines above the start click. Change

```ts
    await adminPage.gameSelector.selectOption({ index: 1 });
    await adminPage.startRoundOneButton.click();

    const hostPassword = await adminPage.hostPassword.innerText();
    buzzersPage.buzzersPasswordInput.fill(hostPassword);
```

to

```ts
    await adminPage.gameSelector.selectOption({ index: 1 });
    const hostPassword = await adminPage.hostPassword.innerText();
    await adminPage.startRoundOneButton.click();

    buzzersPage.buzzersPasswordInput.fill(hostPassword);
```

(b) Replace the whole `afterEach` with:

```ts
  test.afterEach(async () => {
    await adminPage.openPlayers();
    // Clear only if there is something to clear; otherwise fallback to disabled state
    const canClear = await adminPage.clearBuzzersButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (canClear) {
      await adminPage.clearBuzzersButton.click();
      await expect(buzzersPage.buzzersInfo).not.toBeVisible({ timeout: 10000 });
    } else {
      await expect(adminPage.clearBuzzersButtonDisabled).toBeVisible({ timeout: 5000 });
    }
    await adminPage.closeDrawer();
  });
```

- [ ] **Step 8: Run the suite against the dev stack and fix leftovers**

```bash
scripts/node-run.sh npx prettier --write e2e/tests
scripts/e2e-run.sh
```

Expected: all specs pass (retries are configured to 2). For any failure, open the Playwright output, find which moved control the test touched, and apply the same pattern: the control is in the **Flow menu** (`roundSelector`, `hideQuestionsInput`, `titleCardButton`, `finalRoundButton`), the **round tools menu** (`resetMistakesButton`, `showMistakeButton`, `team{n}RemoveStrikeButton`; call `openRoundTools()` first), the **Players drawer** (`clearBuzzersButton`, `players.*`; call `openPlayers()`), or the **Settings drawer/inline lobby** (`gameSelector`, `teamOneNameInput`, `themeSwitcherInput`, `hostPassword`; call `openSettings()` first when the round has started). Do not change product code to satisfy a test unless the test exposes a real regression.

- [ ] **Step 9: Commit**

```bash
git add Friendly-Feud/scripts/e2e-run.sh Friendly-Feud/e2e
git commit -m "test(e2e): adapt Playwright suite to the new console (menus and drawers)"
```

---

### Task 11: Final verification and local preview image

**Files:**
- Modify: none (verification and a rebuild)

- [ ] **Step 1: Full verification**

```bash
cd /home/m0usetrap/FF/friendly-feud-scoring-ui/Friendly-Feud
scripts/node-run.sh npx vitest run
scripts/node-run.sh npx tsc --noEmit
scripts/node-run.sh npx eslint .
scripts/node-run.sh npx prettier --check "src/**/*.{js,jsx,ts,tsx,css}" "e2e/**/*.{js,jsx,ts,tsx,css}"
scripts/e2e-run.sh
```

Expected: all exit 0. Do not claim completion unless every command above has been run and passed in this step.

- [ ] **Step 2: Rebuild the production-style preview**

The earlier preview container `feud-local` (port 8081) is built from the old UI. Rebuild and replace it:

```bash
docker build -f Dockerfile.allinone -t my-feud .
docker rm -f feud-local
docker run -d --name feud-local --restart unless-stopped -p 127.0.0.1:8081:80 \
  -e ADMIN_CONSOLE_PASSWORD=feud-local \
  -e ADMIN_SESSION_SECRET=local-dev-secret-not-for-production-0123456789 \
  my-feud
sleep 25
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8081/
```

Expected: `200`.

- [ ] **Step 3: Stop the dev stack**

```bash
make local-dev-down
```

- [ ] **Step 4: Commit any formatting-only changes**

```bash
cd /home/m0usetrap/FF/friendly-feud-scoring-ui
git status --short
```

If Prettier changed tracked files during Step 1, commit them: `git add -A Friendly-Feud && git commit -m "style: apply prettier"`. Otherwise nothing to commit.

---

## Self-review (done while writing)

**Spec coverage (plan-1 scope):**
- 3 Design system: tokens, type, radii, touch rules → Task 3 (palette, `Button`, `min-h-11`, `touch-manipulation`, focus rings), contrast adjustments recorded in Global Constraints.
- 4.1 Frame: top bar, clickable phase stepper, Flow menu, Players and Settings drawers, Open board, Help, Quit → Tasks 3, 8, 9. Existing ids preserved.
- 4.2 Lobby: Start Round 1 primary, join code, rosters, title music, inline settings → Task 9 Step 3 (interior restyle deferred to plan 2, stated).
- 4.3 Rounds desktop: team columns, centre header/answers, Undo, Next → Tasks 4-6.
- 4.4 Rounds touch: score strip + fixed bottom bar → Task 6 (`ScoreStrip`, `ActionBar`).
- 4.5 Fast Money: kept as-is inside the frame → Task 7 (restyle deferred to plan 2, stated).
- 4.6 Shortcuts: 1-8 and Ctrl/Cmd+Z preserved, plus modal guard → Task 9 Step 3.
- 7 Architecture: `GameDisplay` split into focused components, shared primitives in `ui/` → Tasks 3-9.
- 8 Testing: Vitest for pure helpers (Task 2), tsc/eslint/prettier every task, Playwright adapted (Task 10), manual viewport checks (Task 9 Step 8).
- Not in this plan (intentionally): 5 buzzer pad and server changes, 6 board and player pages, restyle of legacy interiors.

**Placeholder scan:** no TBD/TODO; every code step has full code; the only conditional instructions are the lucide icon fallback (Task 6 Step 6) and the locale-merge fallback (Task 9 Step 6), both with concrete actions.

**Type consistency:** `FlowActions` members (`inProgress`, `startNeedsConfirm`, `goToRound`, `startRoundOne`, `nextRound`, `showTitle`, `goFinal`) are used with the same names in `RoundHeader`, `RoundsConsole`, `ActionBar`, `PhaseStepper`, `FlowMenu`, `GameDisplay`. `TeamColumnState` fields used (`points`, `strikes`, `maxStrikes`, `pot`, `banked`, `bankedPoints`, `inControl`, `canBank`, `name`) match Task 2. `teamUi` returns `outline`/`solid` variants that exist in `ButtonVariant`. `ScoringApi` is imported from `@/components/Admin/GameDisplay/useScoring` everywhere. Button ids match the Global Constraints list.
