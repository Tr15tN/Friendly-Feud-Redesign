# Friendly Feud: UI Modernisation and Physical Buzzer, Design

Date: 2026-10-19
Codebase: `Friendly-Feud/` (Next.js 16 pages router, React 19, Tailwind 4 + `tailwindcss-themer`, Go WebSocket backend)
Baseline: the `scoring-ui` branch (see `extras/COMMITS.txt`).

## 1. Goals

1. Make the host console (`/admin`) modern, streamlined and intuitive. Today it has a pile of equal-weight buttons, a cramped score bar, and buzzers/players far below the answers.
2. Give the TV board (`/game`) and the player pages (home/join, buzzer) the same modern look.
3. Support a **physical buzzer**: a dedicated buzzer page on a separate on-site laptop registers a button press, plays a sound, and makes the admin page ask which team buzzed first.
4. Work well on **desktop (mouse + keyboard)** and **touch (tablet/phone)**.

Out of scope: the game creator (`/new`) and the guide pages (they pick up shared tokens only), changes to scoring rules, new game content, and the deployment to m0usetrap.ee (a separate step after the UI is accepted).

## 2. Decisions already made

| Topic | Decision |
|-------|----------|
| Screens | Host console, TV board, player pages (home/join, buzzer) |
| Devices | Desktop and touch, equally |
| Visual style | "B": dark minimal pro tool (charcoal, thin borders, one indigo accent, tight sans) |
| Rounds layout | Team columns flank the answers on desktop; collapses to a bottom action bar on tablet/phone |
| Buzzer hardware | One USB button on an on-site laptop; host picks the team on screen |
| Buzzer auth | Separate pairing token that can only send a buzz |
| Themes | The TV board keeps its 6 existing themes (including chroma key) |

## 3. Design system

- **Surfaces:** background `#0e1013`, panel `#16191f`, border `#252a33`, button fill `#1d2129`, text `#e8eaee`, muted text `#7c8493`.
- **Accent:** indigo `#6366f1` for the single primary action on screen. Gold `#fbbf24` for the multiplier.
- **Teams:** Alpha rose `#fb7185`, Bravo emerald `#34d399`. These always appear with the team name and a distinguishing mark (name text plus a left/right position), never as the only cue.
- **Strikes:** `#ef4444` filled square with a ✕ glyph, so strikes read without colour.
- **Typography:** an Inter-class sans stack, tight letter-spacing on large numerals, tabular numerals for scores.
- **Shape and spacing:** 10px radius, 8px spacing grid, 1px borders, no heavy shadows.
- **Touch and a11y rules** (from the UI UX Pro Max skill, installed at `.cursor/skills/ui-ux-pro-max/`): interactive controls at least 44px tall; `touch-action: manipulation` on controls; text contrast at least 4.5:1; visible focus ring; `prefers-reduced-motion` respected; confirmation or Undo for irreversible actions.
- **Implementation:** semantic tokens in `tailwind.config.js`. The host console and player pages use a fixed "pro" palette. The board continues to use the themer themes and receives the new type scale and spacing.

## 4. Host console (`/admin`)

### 4.1 Frame
- **Top bar:** room code, a clickable phase stepper (Lobby → Rounds n/N → Fast Money), then icon buttons for Players, Buzzers and Settings (each opens a right-side drawer) and an **Open board** button.
- **Flow menu** (one button): Title Card, jump-to-round, Show/Hide questions, Fast Money. These replace today's row of equal-weight buttons.
- **Drawers:** Players (per-team list, blindfold, remove), Buzzers (order, Clear buzzers), Settings (titles, teams, theme, language, game loader, logo, music, sounds, fast-money target, host password).
- Existing element IDs used by the Playwright tests are preserved where the element still exists.

### 4.2 Lobby
Large join code (and "Join at URL" when configured), per-team rosters with empty states, title-music controls, and one primary **Start Round 1** button.

### 4.3 Rounds, desktop (width ≥ 1024px)
Three columns:
- **Team column (Alpha, left):** name, score, three strike pips, **✕ Strike**, **Bank N**. A "⋯" menu holds Remove strike, Reset strikes, Manual adjust and Buzz-in X.
- **Centre:** round label with prev/next round dots, the pot, ×1/×2/×3 plus a numeric multiplier, the question (collapsible), and the answer tiles (keys 1–8 reveal/hide).
- **Team column (Bravo, right):** same as Alpha, mirrored.
- **Bottom row:** Undo (Ctrl/Cmd+Z) on the left and a primary **Next round →** on the right.
- **Banked state:** the banking team's column shows "Banked N"; both Bank buttons and the multiplier lock; later reveals are marked "not scored" (existing behaviour).
- **Steal hint:** shown in the struck-out team's opponent column when a team has 3 strikes (hint only, as today).

### 4.4 Rounds, touch (width < 1024px)
The team columns collapse into a compact score strip at the top plus a single fixed bottom bar: ✕ Alpha, ✕ Bravo, Bank → Alpha, Bank → Bravo, Undo, Next →. The answer tiles become a large single- or two-column grid.

### 4.5 Fast Money
A top row with the contestant 1/2 switch, timer controls (start/stop/reset) and the Total vs Target readout. Below it, one row per question: contestant answer field, board-answer select, **Reveal**, **Award**, and a status chip. Contestant 2 also shows the partner's answer and an **Already answered** button. The first-half answers can be hidden or revealed from the top row.

### 4.6 Shortcuts
Unchanged: 1–8 toggle answers, Ctrl/Cmd+Z undo. The buzz prompt (section 5.4) adds A/B (or ←/→) to pick a team and Esc to dismiss.

## 5. Physical buzzer

### 5.1 Pairing and auth
- The admin Buzzers drawer has a **Pair a buzzer** section showing a short pair code, a link and a QR code for `/buzzer-pad?room=XXXX&token=...`.
- The server generates a per-room **pad token** (new field on the room, persisted by the SQLite store alongside the host password). A **Regenerate** button invalidates the old token.
- The pad token authorises exactly two actions: `pad_buzz` and `pad_rearm` (and reading the arm/pending state). It never grants host actions.

### 5.2 Buzzer pad page (`/buzzer-pad`)
- Full-screen page for the on-site laptop.
- Listens for the USB button as a key press (default Space/Enter) or a Gamepad API button, plus a large on-screen button for testing.
- **On press:** plays the buzzer sound locally at once, then sends `pad_buzz`.
- **States shown:** `Armed`, `Buzzed, waiting for host`, `Re-armed`, `Disconnected`.
- A short "Press your button" setup step lets the operator confirm the button is detected.

### 5.3 Server behaviour (Go)
- `game` gains `pending_buzz` (`{ "time": <ms> }` or null) and `pad_connected` (bool). Both are included in the normal `data` broadcast so the admin and board receive them.
- New pad actions, authenticated by the pad token, in a map next to `hostRecieveActions` in `pipe.go`:
  - `pad_buzz`: if there is no pending buzz and the room is armed, set `pending_buzz` and broadcast; otherwise ignore. This is the lock-out.
  - `pad_rearm`: clears `pending_buzz` so the pad can buzz again.
- New host actions (behind the existing host password check):
  - `resolve_buzz` with a team: appends a `buzzed` entry for that team through the same logic as `BuzzerScreenBuzz`, clears `pending_buzz`, and broadcasts.
  - `dismiss_buzz`: clears `pending_buzz` without recording a team.
- The existing `BuzzerScreenBuzz`, `/buzzers` page and player buzzers keep working unchanged.

### 5.4 Admin prompt
When `pending_buzz` is set, the admin page shows a modal sheet: "Buzz! Who was first?" with two large team buttons (keys A/B or ←/→) and a Dismiss button (Esc). Picking a team sends `resolve_buzz`. The sheet is touch-friendly and appears over any phase.

### 5.5 TV board
When `pending_buzz` appears, the board shows an immediate "BUZZ!" flash. When the host resolves it, the existing first-buzzer banner shows the team name. Dismissing removes the flash.

## 6. TV board and player pages

- **Board (`/game`):** new type scale and spacing, larger team score panels, three-slot strike trackers and the buzz flash, all within the existing theme system. Behaviour of reveals, strikes, banking and fast money is unchanged.
- **Player pages:** home/join and the buzzer page get the new palette, a centred card layout and a large BUZZ button. Join, team selection and buzz behaviour are unchanged, except for showing the pending/resolved buzz state.

## 7. Architecture and boundaries

- Keep `src/lib/scoring` (pure, unit-tested) untouched. The UI only calls it.
- Split the large `Admin/GameDisplay/index.tsx` into focused components: `TopBar`, `FlowMenu`, `TeamColumn`, `AnswerBoard`, `ActionBar`, `Drawer` plus `PlayersPanel`, `BuzzersPanel`, `SettingsPanel`, `BuzzPrompt`, `FastMoneyConsole`. Each has one purpose and a typed props interface.
- Shared primitives (button, icon button, chip, panel, drawer, sheet) live in `src/components/ui/`.
- Backend changes are limited to the files under `backend/api/` for the pad actions, the room's pad token and the new `game` fields. The Go and TS `Game` types are updated together.

## 8. Testing and verification

- Vitest: existing scoring tests stay green; add tests for any new pure helpers (for example pending-buzz handling).
- Go tests: `pad_buzz` lock-out, `pad_rearm`, `resolve_buzz`, `dismiss_buzz`, and token authorisation (a pad token must not run host actions; a bad token is rejected).
- Playwright: update the e2e models and specs where the flow changes (Flow menu, drawers, team columns) and add a pad-to-prompt-to-banner test.
- Manual checks at 1440×900, 820×1180 (tablet) and 390×844 (phone); contrast and keyboard checks per the skill's checklist.
- Language: new strings go into the English and Estonian locale files; other languages fall back to English.

## 9. Delivery order

1. Design tokens and shared UI primitives.
2. Host console: frame, Rounds screen (desktop and touch), Undo/Next.
3. Host console: Lobby, Fast Money, drawers.
4. TV board restyle.
5. Player pages restyle.
6. Buzzer pad: backend actions, pad page, admin prompt, board flash.
7. Deploy to m0usetrap.ee (separate design).

Live development uses the Next.js dev server in Docker with the source mounted for instant reload; the Go backend is rebuilt when it changes.

## 10. Risks and open items

- The host console currently follows the user-selected theme. Fixing it to the "pro" palette is a deliberate change; the board keeps themes.
- Gamepad API input generally needs the pad page to be focused. The pad page is dedicated and kept in the foreground on the laptop.
- A pad token in a QR/link must be treated as a credential: it is per room and can be regenerated.
- The e2e test suite relies on many element IDs; the refactor must keep or deliberately update them.
