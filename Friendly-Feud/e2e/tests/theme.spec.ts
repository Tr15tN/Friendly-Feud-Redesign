// @ts-check
import fs from "fs";
import path from "path";
import { expect, Page, test } from "@playwright/test";
import { PlayerType, Setup } from "./lib/Setup.js";
import { AdminPage } from "./models/AdminPage.js";
import { LoginPage } from "./models/LoginPage.js";

const THEMES = ["dark", "classic", "sunset", "forest", "neon", "candy"];
// Preset hexes from src/lib/theme/team-palette.ts.
const BLUE = "rgb(96, 165, 250)";
const PURPLE = "rgb(167, 139, 250)";

const htmlTheme = (page: Page) => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
const cssVar = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

test("host can switch UI theme and it persists after a reload", async ({ browser }) => {
  const s = new Setup(browser);
  const host = await s.host();
  const page = host.page;
  expect(await htmlTheme(page)).toBe("dark");

  await page.getByTestId("uiTheme-classic").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "classic");
  await expect(page.getByTestId("uiTheme-classic")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("uiTheme-dark")).toHaveAttribute("aria-pressed", "false");
  expect(await cssVar(page, "--pro-bg")).toBe("7 20 56");

  await page.reload();
  // Applied by the inline script before React hydrates.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "classic");
  expect(await page.evaluate(() => localStorage.getItem("ui-theme"))).toBe("classic");

  // A hand-edited / unknown value falls back to dark instead of breaking the page.
  await page.evaluate(() => localStorage.setItem("ui-theme", 'bogus"><x'));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  // The login page is themed per device too.
  await page.evaluate(() => localStorage.setItem("ui-theme", "neon"));
  const other = await host.context.newPage();
  await other.goto("/");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "neon");
  await new LoginPage(other).hostRoomButton.waitFor();
});

test("team colours chosen by the host show on the TV board and phones", async ({ browser }) => {
  const s = new Setup(browser);
  const host = await s.host();
  const admin = new AdminPage(host.page);

  await host.page.getByTestId("teamColor-0-blue").click();
  await expect(host.page.getByTestId("teamColor-0-blue")).toHaveAttribute("aria-pressed", "true");
  await host.page.getByTestId("teamColor-1-purple").click();
  await expect(host.page.getByTestId("teamColor-1-purple")).toHaveAttribute("aria-pressed", "true");
  // Picking the other team's colour swaps instead of duplicating.
  await host.page.getByTestId("teamColor-0-purple").click();
  await expect(host.page.getByTestId("teamColor-1-blue")).toHaveAttribute("aria-pressed", "true");
  await host.page.getByTestId("teamColor-0-blue").click();
  await host.page.getByTestId("teamColor-1-purple").click();

  await admin.gameSelector.selectOption({ index: 1 });
  await admin.startRoundOneButton.click();

  // Host console.
  await expect.poll(() => cssVar(host.page, "--pro-team0")).toBe("96 165 250");

  // TV board: the team header uses the 700 shade of the chosen colour.
  const tv = await s.addPlayer(PlayerType.SPECTATOR);
  await expect.poll(() => cssVar(tv.page, "--pro-team1")).toBe("167 139 250");
  const [r, g, b] = (await cssVar(tv.page, "--team1-700")).split(" ");
  await expect(
    tv.page.getByTestId("team0TeamName").locator("xpath=ancestor::div[contains(@class,'bg-team1-700')]")
  ).toHaveCSS("background-color", `rgb(${r}, ${g}, ${b})`);

  // Phone join buttons.
  const ctx = await browser.newContext();
  const phone = await ctx.newPage();
  await phone.goto("/");
  const login = new LoginPage(phone);
  await login.roomCodeInput.fill(s.roomCode as string);
  await login.playerNameInput.fill("Colour tester");
  await login.joinRoomButton.click();
  await expect(phone.getByTestId("joinTeam1")).toHaveCSS("color", BLUE);
  await expect(phone.getByTestId("joinTeam2")).toHaveCSS("color", PURPLE);

  // A live change reaches an already-open phone and the TV.
  await host.page.getByTestId("settingsDrawerButton").click();
  await host.page.getByTestId("teamColor-1-pink").click();
  await expect(phone.getByTestId("joinTeam2")).toHaveCSS("color", "rgb(244, 114, 182)");
  await expect.poll(() => cssVar(tv.page, "--pro-team1")).toBe("244 114 182");
  await ctx.close();
});

test("custom team colour is relayed as a validated hex", async ({ browser }) => {
  const s = new Setup(browser);
  const host = await s.host();
  const tv = await s.addPlayer(PlayerType.SPECTATOR);
  await host.page.getByTestId("teamColorCustom-0").fill("#00ff7f");
  await expect.poll(() => cssVar(tv.page, "--pro-team0")).toBe("0 255 127");
});

// Screenshots for visual review: DEMO_SHOTS=/app/e2e/live/theme-shots scripts/e2e-run.sh tests/theme.spec.ts -g shots
test("shots: every theme on lobby, round and TV", async ({ browser }) => {
  const dir = process.env.DEMO_SHOTS;
  test.skip(!dir, "set DEMO_SHOTS to capture screenshots");
  fs.mkdirSync(dir as string, { recursive: true });
  const s = new Setup(browser);
  const host = await s.host();
  const admin = new AdminPage(host.page);
  const tv = await s.addPlayer(PlayerType.SPECTATOR);
  const phone = await s.addPlayer(PlayerType.BUZZER);
  await host.page.setViewportSize({ width: 1280, height: 900 });
  for (const p of [host.page, phone.page]) await p.addStyleTag({ content: "*{transition:none!important}" });
  const shot = (page: Page, name: string) => page.screenshot({ path: path.join(dir as string, `${name}.png`) });

  for (const theme of THEMES) {
    await host.page.getByTestId(`uiTheme-${theme}`).click();
    await host.page.waitForTimeout(500);
    await host.page.evaluate(() => window.scrollTo(0, 0));
    await shot(host.page, `${theme}-1-lobby`);
    await host.page.getByTestId(`uiTheme-${theme}`).scrollIntoViewIfNeeded();
    await shot(host.page, `${theme}-2-lobby-settings`);
  }
  await admin.gameSelector.selectOption({ index: 1 });
  await admin.startRoundOneButton.click();
  await host.page.getByTestId("answer0PointsText").click();
  for (const theme of THEMES) {
    await host.page.evaluate((t) => {
      localStorage.setItem("ui-theme", t);
      document.documentElement.setAttribute("data-theme", t);
    }, theme);
    await phone.page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    await host.page.waitForTimeout(500); // let colour transitions finish
    await shot(host.page, `${theme}-3-round`);
    await shot(phone.page, `${theme}-4-phone`);
  }
  await shot(tv.page, "tv-board");
});

test("the interactive demo follows the device theme", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("ui-theme", "classic"));
  const page = await context.newPage();
  await page.goto("/demo");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "classic");
  await expect(page.getByTestId("demoStepTitle")).toBeVisible();
  const dir = process.env.DEMO_SHOTS;
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
    await page.getByTestId("demoNext").click();
    await page.waitForTimeout(1500); // mid-step: spotlight ring + cursor visible
    await page.screenshot({ path: path.join(dir, "classic-demo.png") });
  }
  await context.close();
});
