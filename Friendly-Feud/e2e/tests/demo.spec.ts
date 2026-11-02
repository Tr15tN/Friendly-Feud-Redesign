// @ts-check
import { expect, Page, test } from "@playwright/test";
import fs from "fs";
import path from "path";

const SHOTS = process.env.DEMO_SHOTS ?? "";

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

const TITLES = [
  "Welcome to the demo",
  "Load a question set",
  "Name your teams",
  "Players join on their phones",
  "Put the board on the TV",
  "Start round 1",
  "Buzz in",
  "Reveal answers",
  "Strikes and stealing",
  "Bank the points",
  "Next round and the Flow menu",
  "A real buzzer",
  "Fast Money",
  "You are ready to host",
];

test.use({ locale: "en-US" });

test.describe("Interactive demo", () => {
  test("is reachable from the home page and never talks to the server", async ({ page }) => {
    const sockets: string[] = [];
    // The dev server keeps its own hot-reload socket; only the game socket matters.
    page.on("websocket", (ws) => ws.url().includes("/api/ws") && sockets.push(ws.url()));

    await page.goto("/");
    await page.getByTestId("demoLink").click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.getByTestId("demoStepTitle")).toHaveText(TITLES[0]);
    // The practice room, not a real one.
    await expect(page.getByTestId("roomCodeText")).toHaveText("DEMO");
    expect(sockets).toEqual([]);

    // The visitor's real session cookie is left alone.
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "session")).toBeUndefined();
  });

  test("walks through every step, with the TV and phone reacting", async ({ page }) => {
    test.setTimeout(240000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/demo");
    const tv = page.frameLocator('iframe[title="TV board"]');
    const phone = page.frameLocator('iframe[title="Player phone"]');

    for (let i = 0; i < TITLES.length; i++) {
      await expect(page.getByTestId("demoStepTitle")).toHaveText(TITLES[i]);
      // Wait for the step to finish playing (Replay shows when idle), speeding it up like a returning visitor would.
      if (i > 0) await page.getByTestId("demoSkip").click({ timeout: 20000 }).catch(() => undefined);
      await expect(page.getByTestId("demoReplay")).toBeVisible({ timeout: 60000 });
      await expect(page.getByTestId("demoCaption")).not.toContainText("got stuck");
      await shot(page, `step-${String(i + 1).padStart(2, "0")}`);

      if (TITLES[i] === "Load a question set") {
        await expect(page.getByTestId("startRoundOneButton")).toBeVisible();
      }
      if (TITLES[i] === "Name your teams") {
        await expect(page.getByTestId("lobbyTeam0Name")).toHaveText("Reds");
        await expect(page.getByTestId("lobbyTeam1Name")).toHaveText("Blues");
      }
      if (TITLES[i] === "Players join on their phones") {
        await expect(page.getByTestId("lobbyRoster")).toContainText("Anna");
        await expect(page.getByTestId("lobbyRoster")).toContainText("Jaan");
        await expect(phone.getByTestId("quitButton")).toBeVisible();
      }
      if (TITLES[i] === "Start round 1") {
        await expect(page.getByTestId("currentRoundQuestionText")).toContainText("picnic");
        await expect(tv.getByTestId("answer0UnAnswered")).toBeVisible();
      }
      if (TITLES[i] === "Buzz in") {
        await expect(page.getByTestId("firstBuzzChip")).toBeVisible();
      }
      if (TITLES[i] === "Reveal answers") {
        await expect(tv.getByTestId("answer0Answered")).toContainText("Sandwiches");
        await expect(tv.getByTestId("answer2Answered")).toBeVisible();
      }
      if (TITLES[i] === "Strikes and stealing") {
        await expect(page.getByTestId("stealHint")).toBeVisible();
      }
      if (TITLES[i] === "Bank the points") {
        await expect(page.getByTestId("adminTeam1Points")).not.toHaveText("0");
      }
      if (TITLES[i] === "Next round and the Flow menu") {
        await expect(page.getByTestId("currentRoundQuestionText")).toContainText("late for work");
      }
      if (TITLES[i] === "Fast Money") {
        await expect(page.getByTestId("finalRoundNumberText")).toBeVisible();
        await expect(tv.getByTestId("finalRound1Answer0Text")).toContainText("Dog");
      }

      if (i < TITLES.length - 1) await page.getByTestId("demoNext").click();
    }
    expect(errors).toEqual([]);
  });

  test("Back restores the earlier state, and Replay plays the step again", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/demo");
    const next = async () => {
      await page.getByTestId("demoSkip").click({ timeout: 3000 }).catch(() => undefined);
      await expect(page.getByTestId("demoReplay")).toBeVisible({ timeout: 40000 });
      await page.getByTestId("demoNext").click();
    };
    await next(); // -> load
    await next(); // -> teams (set loaded)
    await next(); // -> players (teams named)
    await expect(page.getByTestId("demoStepTitle")).toHaveText(TITLES[3]);
    await page.getByTestId("demoSkip").click({ timeout: 3000 }).catch(() => undefined);
    await expect(page.getByTestId("demoReplay")).toBeVisible({ timeout: 40000 });
    await expect(page.getByTestId("lobbyRoster")).toContainText("Jaan");

    await page.getByTestId("demoBack").click();
    await expect(page.getByTestId("demoStepTitle")).toHaveText(TITLES[2]);
    await page.getByTestId("demoSkip").click({ timeout: 3000 }).catch(() => undefined);
    await expect(page.getByTestId("demoReplay")).toBeVisible({ timeout: 40000 });
    // The players from the later step are gone again, and the earlier work is still there.
    await expect(page.getByTestId("lobbyRoster")).not.toContainText("Jaan");
    await expect(page.getByTestId("lobbyTeam0Name")).toHaveText("Reds");

    await page.getByTestId("demoReplay").click();
    await page.getByTestId("demoSkip").click({ timeout: 3000 }).catch(() => undefined);
    await expect(page.getByTestId("demoReplay")).toBeVisible({ timeout: 40000 });
    await expect(page.getByTestId("lobbyTeam0Name")).toHaveText("Reds");
  });

  test("shows the cursor while a step plays, and Skip animation finishes it", async ({ page }) => {
    await page.goto("/demo");
    await page.getByTestId("demoNext").click();
    await expect(page.getByTestId("demoStepTitle")).toHaveText(TITLES[1]);
    await expect.poll(async () => Number(await page.getByTestId("demoCursor").evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0.5);
    await shot(page, "playing-load");
    await page.getByTestId("demoSkip").click();
    await expect(page.getByTestId("demoReplay")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("startRoundOneButton")).toBeVisible();
  });
});
