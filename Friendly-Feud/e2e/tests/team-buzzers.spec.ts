// @ts-check
import { expect, Page, test } from "@playwright/test";
import { PlayerType, Setup } from "./lib/Setup.js";
import { AdminPage } from "./models/AdminPage.js";
import { HostBuzzerPage } from "./models/HostBuzzerPage.js";

/** A host console plus the buzzers screen, signed in and with round 1 running. */
async function setUp(browser: import("@playwright/test").Browser, beforeBuzzers?: (page: Page) => Promise<void>) {
  const s = new Setup(browser);
  const host = await s.host();
  const adminPage = new AdminPage(host.page);
  await adminPage.teamOneNameInput.fill("Alpha");
  await adminPage.teamTwoNameInput.fill("Beta");
  const hostPassword = await adminPage.hostPassword.innerText();
  await adminPage.gameSelector.selectOption({ index: 1 });
  await adminPage.startRoundOneButton.click();

  const buzzers = await s.addPlayer(PlayerType.HOST_BUZZER);
  const buzzersPage = new HostBuzzerPage(buzzers.page);
  if (beforeBuzzers) await beforeBuzzers(buzzers.page);
  await buzzersPage.buzzersPasswordInput.fill(hostPassword);
  await buzzersPage.buzzersSubmitButton.click();
  await expect(buzzers.page.getByTestId("buzzerKeysButton")).toBeVisible({ timeout: 10000 });
  return { adminPage, page: buzzers.page, buzzersPage, hostPassword };
}

/** Bind a physical key to a team through the settings dialog. */
async function bindTeamKey(page: Page, team: 0 | 1, key: string) {
  await page.getByTestId("buzzerKeysButton").click();
  await page.getByTestId(`addTeamBuzzerKey${team}`).click();
  await expect(page.getByTestId("bindCapturePrompt")).toBeVisible();
  await page.keyboard.press(key);
}

test.describe("Team buttons and lights on the buzzers screen", () => {
  test("each team can have its own button, and a press buzzes for that team without asking", async ({ browser }) => {
    const { adminPage, page } = await setUp(browser);

    await bindTeamKey(page, 0, "a");
    await page.getByTestId("addTeamBuzzerKey1").click();
    await page.keyboard.press("l");
    // The keys are listed with their team, and the test box says whose button it was.
    await expect(page.locator('select[data-key-code="KeyA"]')).toHaveValue("0");
    await expect(page.locator('select[data-key-code="KeyL"]')).toHaveValue("1");
    await page.keyboard.press("l");
    await expect(page.getByTestId("buzzerKeyTest")).toContainText("Beta");
    await page.getByRole("button", { name: "Done" }).click();

    await page.click("body");
    await page.keyboard.press("l");
    await expect(page.getByTestId("buzzersInfo")).toContainText("Team Beta", { timeout: 10000 });
    // No "Who was first?" question: the button already says who it was.
    await expect(adminPage.page.getByTestId("whoWasFirstDialog")).toHaveCount(0);

    await adminPage.openPlayers();
    await adminPage.clearBuzzersButton.click();
    await adminPage.closeDrawer();
    await expect(page.getByTestId("buzzersInfo")).toHaveCount(0, { timeout: 10000 });

    await page.keyboard.press("a");
    await expect(page.getByTestId("buzzersInfo")).toContainText("Team Alpha", { timeout: 10000 });

    // Still there after a reload (saved on this device).
    await page.reload();
    const stored = await page.evaluate(() => window.localStorage.getItem("famf.buzzerKeys"));
    expect(stored).toContain('"team":1');
    await page.evaluate(() => window.localStorage.removeItem("famf.buzzerKeys"));
  });

  test("a web-address light is called for the team that buzzed, and switched off when buzzers are cleared", async ({
    browser,
  }) => {
    const calls: string[] = [];
    const { adminPage, page } = await setUp(browser);
    await page.route("https://lights.test/**", (route) => {
      calls.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
      return route.fulfill({ status: 200, body: "ok" });
    });

    await bindTeamKey(page, 1, "l");
    await page.getByTestId("lightsMode").selectOption("webhook");
    await page.getByTestId("lights-webhook-team0").fill("https://lights.test/red");
    await page.getByTestId("lights-webhook-team1").fill("POST https://lights.test/blue");
    await page.getByTestId("lights-webhook-off").fill("https://lights.test/off");

    // The test buttons call the same addresses.
    await page.getByTestId("lightsTest-team0").click();
    await expect.poll(() => calls).toContain("GET /red");
    await page.getByRole("button", { name: "Done" }).click();

    await page.click("body");
    await page.keyboard.press("l");
    await expect.poll(() => calls).toContain("POST /blue");

    await adminPage.openPlayers();
    await adminPage.clearBuzzersButton.click();
    await adminPage.closeDrawer();
    await expect.poll(() => calls).toContain("GET /off");

    await page.evaluate(() => {
      window.localStorage.removeItem("famf.buzzerKeys");
      window.localStorage.removeItem("famf.buzzerLights");
    });
  });

  test("a serial board gets the text for the team that buzzed", async ({ browser }) => {
    // A fake Web Serial port that remembers what is written to it.
    const fakeSerial = async (page: Page) => {
      await page.addInitScript(() => {
        const written: number[][] = [];
        (window as unknown as { __serialWrites: number[][] }).__serialWrites = written;
        const port = {
          open: async () => undefined,
          close: async () => undefined,
          writable: {
            getWriter: () => ({
              write: async (bytes: Uint8Array) => void written.push(Array.from(bytes)),
              releaseLock: () => undefined,
            }),
          },
        };
        Object.defineProperty(navigator, "serial", {
          value: { requestPort: async () => port, getPorts: async () => [] },
          configurable: true,
        });
      });
    };
    const { page, hostPassword } = await setUp(browser, fakeSerial);
    // addInitScript only applies to later navigations.
    await page.reload();
    await page.getByTestId("buzzersPasswordInput").fill(hostPassword);
    await page.getByTestId("buzzersSubmitButton").click();
    await expect(page.getByTestId("buzzerKeysButton")).toBeVisible({ timeout: 10000 });

    await bindTeamKey(page, 0, "a");
    await page.getByTestId("lightsMode").selectOption("serial");
    await page.getByTestId("lights-serial-team0").fill("\\xA0\\x01\\x01\\xA2");
    await page.getByTestId("lightsConnect").click();
    await expect(page.getByTestId("lightsStatus")).toHaveText("Connected");
    await page.getByRole("button", { name: "Done" }).click();

    await page.click("body");
    await page.keyboard.press("a");
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __serialWrites: number[][] }).__serialWrites))
      .toContainEqual([0xa0, 1, 1, 0xa2]);

    await page.evaluate(() => {
      window.localStorage.removeItem("famf.buzzerKeys");
      window.localStorage.removeItem("famf.buzzerLights");
    });
  });
});
