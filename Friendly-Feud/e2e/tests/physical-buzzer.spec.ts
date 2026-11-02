// @ts-check
import { expect, test } from "@playwright/test";
import { PlayerType, Setup } from "./lib/Setup.js";
import { AdminPage } from "./models/AdminPage.js";
import { HostBuzzerPage } from "./models/HostBuzzerPage.js";

// The USB buzzer types a key (Enter by default). Pressing it asks the host who was first.
test.describe("Physical buzzer on the buzzers page", () => {
  let buzzersPage: HostBuzzerPage;
  let adminPage: AdminPage;
  let hostPassword = "";
  let roomCode = "";

  test.beforeAll(async ({ browser }) => {
    const s = new Setup(browser);
    const host = await s.host();
    const buzzers = await s.addPlayer(PlayerType.HOST_BUZZER);
    buzzersPage = new HostBuzzerPage(buzzers.page);
    adminPage = new AdminPage(host.page);

    await adminPage.teamOneNameInput.fill("Alpha");
    await adminPage.teamTwoNameInput.fill("Beta");
    await adminPage.gameSelector.selectOption({ index: 1 });
    hostPassword = await adminPage.hostPassword.innerText();
    roomCode = s.roomCode as string;
    await adminPage.startRoundOneButton.click();

    await buzzersPage.buzzersPasswordInput.fill(hostPassword);
    await buzzersPage.buzzersSubmitButton.click();
    await expect(buzzersPage.buzzerButtons[0].button).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async () => {
    const dialog = adminPage.page.getByTestId("whoWasFirstDialog");
    if (await dialog.isVisible().catch(() => false)) {
      await adminPage.page.getByTestId("whoWasFirstIgnore").click();
    }
    await adminPage.openPlayers();
    const canClear = await adminPage.clearBuzzersButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (canClear) {
      await adminPage.clearBuzzersButton.click();
      await expect(buzzersPage.buzzersInfo).not.toBeVisible({ timeout: 10000 });
    }
    await adminPage.closeDrawer();
  });

  test("pressing the buzzer asks the host who was first", async () => {
    await buzzersPage.page.click("body");
    await buzzersPage.page.keyboard.press("Enter");

    const dialog = adminPage.page.getByTestId("whoWasFirstDialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(buzzersPage.buzzersInfo).toContainText("BUZZ!", { timeout: 10000 });

    await adminPage.page.getByTestId("whoWasFirstTeam1").click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
    await expect(buzzersPage.buzzersInfo).toContainText("Team Beta", { timeout: 10000 });
  });

  test("the host can answer with the 1 and 2 keys", async () => {
    await buzzersPage.page.click("body");
    await buzzersPage.page.keyboard.press("Enter");
    const dialog = adminPage.page.getByTestId("whoWasFirstDialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await adminPage.page.keyboard.press("1");
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
    await expect(buzzersPage.buzzersInfo).toContainText("Team Alpha", { timeout: 10000 });
  });

  test("ignoring a buzz clears it", async () => {
    await buzzersPage.page.click("body");
    await buzzersPage.page.keyboard.press("Enter");
    const dialog = adminPage.page.getByTestId("whoWasFirstDialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await adminPage.page.getByTestId("whoWasFirstIgnore").click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
    await expect(buzzersPage.buzzersInfo).not.toBeVisible({ timeout: 10000 });
  });

  test("works when opened straight from a /buzzers link", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/buzzers?room=${roomCode}`);
    const submit = page.getByTestId("buzzersSubmitButton");
    await expect(submit).toBeEnabled({ timeout: 10000 });
    await page.getByTestId("buzzersPasswordInput").fill(hostPassword);
    await submit.click();
    await expect(page.getByTestId("buzzerKeysButton")).toBeVisible({ timeout: 10000 });

    await page.click("body");
    await page.keyboard.press("Enter");
    await expect(adminPage.page.getByTestId("whoWasFirstDialog")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("buzzersInfo")).toContainText("BUZZ!", { timeout: 10000 });
    await context.close();
  });

  test("any key can be bound as the buzzer", async () => {
    const page = buzzersPage.page;
    await page.getByTestId("buzzerKeysButton").click();
    await page.getByTestId("addBuzzerKey").click();
    await expect(page.getByTestId("bindCapturePrompt")).toBeVisible();
    await page.keyboard.press("b");

    // The test box lights up for a bound key and the key is remembered.
    await page.keyboard.press("b");
    await expect(page.getByTestId("buzzerKeyTest")).toContainText("Buzzer pressed!");
    await page.reload();

    // Bindings survive a reload (stored in this browser).
    const stored = await page.evaluate(() => window.localStorage.getItem("famf.buzzerKeys"));
    expect(stored).toContain('"KeyB"');
    await page.evaluate(() => window.localStorage.removeItem("famf.buzzerKeys"));
  });
});
