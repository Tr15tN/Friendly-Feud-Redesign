// Live audit: drives a real game on the deployed site and saves screenshots plus a pass/fail log.
// Run with: scripts/live-audit.sh   (default target https://m0usetrap.ee)
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.AUDIT_BASE_URL ?? "https://m0usetrap.ee";
const OUT = process.env.AUDIT_OUT ?? "/app/e2e/live/screens";
fs.mkdirSync(OUT, { recursive: true });

const results = [];
let shotNo = 0;

async function shot(page, name) {
  shotNo += 1;
  const file = `${OUT}/${String(shotNo).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: file, fullPage: false }).catch((e) => console.log("shot failed", name, e.message));
  return file;
}

async function step(label, fn, page) {
  const started = Date.now();
  try {
    await fn();
    results.push({ label, ok: true, ms: Date.now() - started });
    console.log(`PASS ${label}`);
  } catch (error) {
    results.push({ label, ok: false, error: String(error.message).split("\n")[0] });
    console.log(`FAIL ${label}: ${String(error.message).split("\n")[0]}`);
    if (page) await shot(page, `FAIL-${label.replace(/\W+/g, "-").slice(0, 40)}`);
  }
}

const browser = await chromium.launch();
const newCtx = (opts = {}) => browser.newContext({ baseURL: BASE, ...opts });
const id = (page, v) => page.locator(`#${v}`);

async function runViewport(name, ctxOpts) {
  console.log(`\n=== ${name} ===`);
  const hostCtx = await newCtx(ctxOpts);
  const host = await hostCtx.newPage();
  host.setDefaultTimeout(15000);
  const consoleErrors = [];
  host.on("pageerror", (e) => consoleErrors.push(`host pageerror: ${e.message}`));

  await step(`${name}: home page loads`, async () => {
    await host.goto("/", { waitUntil: "domcontentloaded" });
    await id(host, "hostRoomButton").waitFor();
    await shot(host, `${name}-home-en`);
  }, host);

  await step(`${name}: home in Estonian`, async () => {
    await host.locator("#languageInput").selectOption("et");
    await host.waitForTimeout(500);
    await shot(host, `${name}-home-et`);
    await host.locator("#languageInput").selectOption("en");
  }, host);

  let roomCode = "";
  let hostPw = "";
  await step(`${name}: host creates a room`, async () => {
    await id(host, "hostRoomButton").click();
    await id(host, "roomCodeText").waitFor();
    roomCode = (await id(host, "roomCodeText").innerText()).trim();
    if (!/^[A-Z]{4}$/.test(roomCode)) throw new Error(`odd room code ${roomCode}`);
    await shot(host, `${name}-host-setup-before-load`);
  }, host);
  if (!roomCode) return;

  await step(`${name}: load a built-in game`, async () => {
    await id(host, "gameSelector").selectOption({ index: 1 });
    await id(host, "startRoundOneButton").waitFor();
    hostPw = (await id(host, "hostPassword").innerText().catch(() => "")).trim();
    await shot(host, `${name}-host-lobby`);
  }, host);

  // Players
  const players = [];
  for (const [i, team] of [[0, 0], [1, 1]]) {
    const ctx = await newCtx(ctxOpts);
    const page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    players.push(page);
    await step(`${name}: player ${i + 1} joins team ${team + 1}`, async () => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await id(page, "roomCodeInput").fill(roomCode);
      await id(page, "playerNameInput").fill(`Tester ${i + 1}`);
      if (i === 0) await shot(page, `${name}-player-login-filled`);
      await id(page, "joinRoomButton").click();
      await id(page, team === 0 ? "joinTeam1" : "joinTeam2").waitFor();
      if (i === 0) await shot(page, `${name}-player-pick-team`);
      await id(page, team === 0 ? "joinTeam1" : "joinTeam2").click();
      await id(page, "registerBuzzerButton").waitFor();
      if (i === 0) await shot(page, `${name}-player-ready-to-register`);
      await id(page, "registerBuzzerButton").click();
      await id(page, "buzzerButton").or(id(page, "waitingForHostText")).first().waitFor();
      if (i === 0) await shot(page, `${name}-player-waiting`);
    }, page);
  }

  await step(`${name}: host sees players in lobby`, async () => {
    await host.waitForTimeout(800);
    await shot(host, `${name}-host-lobby-with-players`);
  }, host);

  // Board window
  const board = await hostCtx.newPage();
  board.setDefaultTimeout(15000);
  await step(`${name}: open game window (board)`, async () => {
    await board.goto("/game", { waitUntil: "domcontentloaded" });
    await board.waitForTimeout(1500);
    await shot(board, `${name}-board-title`);
  }, board);

  await step(`${name}: start round 1`, async () => {
    await id(host, "startRoundOneButton").click();
    await id(host, "question0Button").waitFor();
    await host.waitForTimeout(500);
    await shot(host, `${name}-host-round1`);
    await shot(board, `${name}-board-round1-hidden`);
  }, host);

  await step(`${name}: reveal an answer`, async () => {
    await id(host, "question0Button").click();
    await host.waitForTimeout(700);
    await shot(host, `${name}-host-answer-revealed`);
    await shot(board, `${name}-board-answer-revealed`);
  }, host);

  await step(`${name}: player buzzes`, async () => {
    await id(players[0], "buzzerButton").click();
    await host.waitForTimeout(900);
    await shot(players[0], `${name}-player-buzzed`);
    await shot(board, `${name}-board-buzz-popup`);
    await shot(host, `${name}-host-after-buzz`);
  }, host);

  await step(`${name}: strike (mistake)`, async () => {
    await id(host, "team0MistakeButton").click();
    await host.waitForTimeout(300);
    await shot(board, `${name}-board-strike`);
    await host.waitForTimeout(2500);
    await shot(host, `${name}-host-after-strike`);
  }, host);

  await step(`${name}: bank points`, async () => {
    await id(host, "team0GivePointsButton").click();
    await host.waitForTimeout(800);
    await shot(host, `${name}-host-banked`);
    await shot(board, `${name}-board-banked`);
  }, host);

  await step(`${name}: players drawer`, async () => {
    await id(host, "playersDrawerButton").click();
    await id(host, "playersDrawer").waitFor();
    await shot(host, `${name}-host-players-drawer`);
    await host.keyboard.press("Escape");
  }, host);

  await step(`${name}: flow menu`, async () => {
    await id(host, "flowMenuButton").click();
    await host.waitForTimeout(300);
    await shot(host, `${name}-host-flow-menu`);
    await host.keyboard.press("Escape");
  }, host);

  // Physical buzzer page
  const padCtx = await newCtx(ctxOpts);
  const pad = await padCtx.newPage();
  pad.setDefaultTimeout(15000);
  await step(`${name}: buzzer pad (USB buzzer) + who was first`, async () => {
    const pw = hostPw;
    // A player buzz is still on the board; the physical buzzer only counts once buzzers are cleared.
    await id(host, "playersDrawerButton").click();
    await id(host, "clearBuzzersButton").click();
    await host.keyboard.press("Escape");
    await pad.goto(`/buzzers?room=${roomCode}`, { waitUntil: "domcontentloaded" });
    await pad.waitForTimeout(2500); // let the websocket connect before submitting
    await shot(pad, `${name}-pad-password`);
    if (!pw) {
      // Host password lives in the settings panel; open it through the page text
      throw new Error("host password not readable on the lobby page");
    }
    console.log("hostPw length", pw.length);
    await id(pad, "buzzersPasswordInput").fill(pw);
    await id(pad, "buzzersSubmitButton").click();
    await pad.waitForTimeout(2500);
    await shot(pad, `${name}-pad-after-submit`);
    await id(pad, "buzzerKeysButton").waitFor();
    await shot(pad, `${name}-pad-ready`);
    await pad.click("body");
    await pad.keyboard.press("Enter");
    await id(host, "whoWasFirstDialog").waitFor();
    await shot(host, `${name}-host-who-was-first`);
    await shot(pad, `${name}-pad-pending`);
    await id(host, "whoWasFirstTeam1").click();
    await host.waitForTimeout(800);
    await shot(pad, `${name}-pad-resolved`);
    await shot(board, `${name}-board-after-resolve`);
  }, host);

  await step(`${name}: pad key settings`, async () => {
    await id(pad, "buzzerKeysButton").click();
    await id(pad, "buzzerKeySettings").waitFor();
    await shot(pad, `${name}-pad-key-settings`);
    await pad.keyboard.press("Escape");
  }, pad);

  await step(`${name}: Fast Money screen`, async () => {
    await host.reload({ waitUntil: "domcontentloaded" });
    await host.waitForTimeout(1500);
    await shot(host, `${name}-host-after-reload`);
    const fm = host.getByRole("button", { name: /Fast Money/i }).first();
    await fm.click();
    await host.waitForTimeout(800);
    await shot(host, `${name}-host-fast-money`);
  }, host);

  for (const [label, url] of [["guide", "/docs/en/guide"], ["help", "/docs/en/help"]]) {
    await step(`${name}: docs ${label}`, async () => {
      const page = await hostCtx.newPage();
      page.setDefaultTimeout(15000);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      await shot(page, `${name}-docs-${label}`);
      await page.close();
    }, host);
  }

  if (consoleErrors.length) {
    results.push({ label: `${name}: page errors`, ok: false, error: consoleErrors.slice(0, 5).join(" | ") });
    console.log("PAGE ERRORS", consoleErrors.slice(0, 5));
  }

  await hostCtx.close();
}

await runViewport("desktop", { viewport: { width: 1280, height: 800 } });
await runViewport("mobile", { ...devices["Pixel 7"] });

await browser.close();
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
process.exit(0);
