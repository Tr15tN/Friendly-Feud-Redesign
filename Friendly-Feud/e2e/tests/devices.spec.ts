// @ts-check
import { Browser, expect, Page, test } from "@playwright/test";
import { Setup } from "./lib/Setup.js";
import { AdminPage } from "./models/AdminPage.js";

type Role = "tv" | "buzzers" | "lights";

/** The host makes a device in the Devices drawer and returns its pairing code. */
async function addDevice(
  host: Page,
  name: string,
  roles: Role[]
): Promise<{ code: string; card: ReturnType<Page["locator"]> }> {
  if (!(await host.getByTestId("newDeviceName").isVisible())) {
    await host.getByTestId("devicesDrawerButton").click();
  }
  await host.getByTestId("newDeviceName").fill(name);
  for (const role of ["tv", "buzzers", "lights"] as Role[]) {
    const box = host.getByTestId(`deviceRole-${role}`);
    if (roles.includes(role)) await box.check();
    else await box.uncheck();
  }
  await host.getByTestId("createDeviceButton").click();
  const card = host.locator('li[id^="deviceCard-"]').filter({ has: host.locator(`input[value="${name}"]`) });
  const code = (await card.locator('[id^="deviceCode-"]').innerText()).trim();
  expect(code).toMatch(/^[A-Z]{4}-[A-Z2-9]{4}$/);
  return { code, card };
}

async function newDevicePage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

/** Type the code on /connect like someone at the TV would. */
async function pairByTyping(page: Page, code: string) {
  await page.goto("/connect");
  await page.getByTestId("pairCodeInput").fill(code);
  await page.getByTestId("pairSubmitButton").click();
  await expect(page).toHaveURL(/\/device$/, { timeout: 10000 });
}

async function pickGame(host: Page) {
  const admin = new AdminPage(host);
  await expect(admin.gameSelector.locator("option")).not.toHaveCount(1, { timeout: 15000 });
  await admin.gameSelector.selectOption({ index: 1 });
}

async function startRound(host: Page) {
  const admin = new AdminPage(host);
  await admin.teamOneNameInput.fill("Alpha");
  await admin.teamTwoNameInput.fill("Beta");
  await pickGame(host);
  await admin.startRoundOneButton.click();
  return admin;
}

test("the host adds a TV and buzzer buttons with their own codes, and can remove one", async ({ browser }) => {
  const s = new Setup(browser);
  const host = (await s.host()).page;
  await startRound(host);

  // A TV that types the code.
  const tv = await addDevice(host, "Stage TV", ["tv"]);
  const tvPage = await newDevicePage(browser);
  await pairByTyping(tvPage, tv.code);
  await expect(tvPage.getByTestId("tvCanvas")).toBeVisible({ timeout: 10000 });
  await expect(tv.card.locator('[id^="deviceStatus-"]')).toHaveText("Online", { timeout: 10000 });
  await expect(host.getByTestId("devicesOnlineBadge")).toBeVisible();

  // Buttons that open the link with the code in it: nothing to type.
  const buttons = await addDevice(host, "Desk buttons", ["buzzers"]);
  const buttonsPage = await newDevicePage(browser);
  await buttonsPage.goto(`/connect?code=${buttons.code}`);
  await expect(buttonsPage).toHaveURL(/\/device$/, { timeout: 10000 });
  await expect(buttonsPage.getByTestId("buzzersButtonTeam0")).toBeVisible({ timeout: 10000 });
  await expect(buttons.card.locator('[id^="deviceStatus-"]')).toHaveText("Online", { timeout: 10000 });

  // The buttons really buzz for the room, and nothing needed the host password.
  await buttonsPage.getByTestId("buzzersButtonTeam0").click();
  await expect(buttonsPage.getByTestId("buzzersInfo")).toContainText("Team Alpha", { timeout: 10000 });

  // A reload of the TV signs it straight back in.
  await tvPage.reload();
  await expect(tvPage.getByTestId("tvCanvas")).toBeVisible({ timeout: 10000 });
  await expect(tv.card.locator('[id^="deviceStatus-"]')).toHaveText("Online", { timeout: 10000 });

  // Removing the buttons sends that device back to the pairing page with a reason; the TV is untouched.
  await buttons.card.locator('[id^="revokeDevice-"]').click();
  await buttons.card.locator('[id^="revokeDevice-"]').click();
  await expect(buttonsPage).toHaveURL(/\/connect\?lost=revoked/, { timeout: 10000 });
  await expect(buttonsPage.getByTestId("connectLostMessage")).toContainText("The host removed this device");
  await expect(tvPage.getByTestId("tvCanvas")).toBeVisible();
  await expect(host.locator('li[id^="deviceCard-"]')).toHaveCount(1);

  // The old link no longer works: a code is used once.
  await buttonsPage.goto(`/connect?code=${buttons.code}`);
  await expect(buttonsPage.getByTestId("connectError")).toBeVisible({ timeout: 10000 });
});

test("a wrong code is explained and a used code does not work twice", async ({ browser }) => {
  const s = new Setup(browser);
  const host = (await s.host()).page;
  const light = await addDevice(host, "Light box", ["lights"]);

  const page = await newDevicePage(browser);
  await page.goto("/connect");
  await expect(page.getByTestId("pairSubmitButton")).toBeDisabled();
  await page.getByTestId("pairCodeInput").fill("zzzz-2222");
  await expect(page.getByTestId("pairCodeInput")).toHaveValue("ZZZZ-2222");
  await page.getByTestId("pairSubmitButton").click();
  await expect(page.getByTestId("connectError")).toContainText("That code does not work", { timeout: 10000 });

  await page.getByTestId("pairCodeInput").fill(light.code.toLowerCase());
  await page.getByTestId("pairSubmitButton").click();
  await expect(page).toHaveURL(/\/device$/, { timeout: 10000 });
  await expect(page.getByTestId("lightsDevicePanel")).toBeVisible({ timeout: 10000 });

  const other = await newDevicePage(browser);
  await other.goto("/connect");
  await other.getByTestId("pairCodeInput").fill(light.code);
  await other.getByTestId("pairSubmitButton").click();
  await expect(other.getByTestId("connectError")).toBeVisible({ timeout: 10000 });
});

test("one device can be TV, buzzer buttons and lights at once, and be disconnected from its gear", async ({
  browser,
}) => {
  const s = new Setup(browser);
  const host = (await s.host()).page;
  await startRound(host);

  const all = await addDevice(host, "Everything", ["tv", "buzzers", "lights"]);
  const page = await newDevicePage(browser);
  await pairByTyping(page, all.code);
  await expect(page.getByTestId("tvCanvas")).toBeVisible({ timeout: 10000 });
  await expect(all.card.locator('[id^="deviceStatus-"]')).toHaveText("Online", { timeout: 10000 });

  // The buzzer key works while the TV picture is on screen, and the host is asked who was first.
  await page.click("body");
  await page.keyboard.press("Enter");
  await expect(host.getByTestId("whoWasFirstDialog")).toBeVisible({ timeout: 10000 });
  await host.getByTestId("whoWasFirstIgnore").click();

  // The gear is there for the person at the device.
  await page.getByTestId("deviceGearButton").click();
  await page.getByTestId("deviceSettingsButton").click();
  await expect(page.getByText("Buzzer keys").first()).toBeVisible();
  await page.getByRole("button", { name: "Close" }).first().click();
  await page.getByTestId("deviceGearButton").click();
  await page.getByTestId("deviceDisconnectButton").click();
  await expect(page).toHaveURL(/\/connect$/, { timeout: 10000 });

  // Back on the pairing page the device is not signed in any more.
  await page.goto("/device");
  await expect(page).toHaveURL(/\/connect$/, { timeout: 10000 });
});

test("a device can be paired while joining is locked, and one with no pairing is sent to /connect", async ({
  browser,
}) => {
  const s = new Setup(browser);
  const host = (await s.host()).page;
  await pickGame(host);
  await host.getByLabel("Lock joining").check();
  await expect(host.getByTestId("lobbyJoiningClosed")).toBeVisible();

  const tv = await addDevice(host, "TV", ["tv"]);
  const page = await newDevicePage(browser);
  await pairByTyping(page, tv.code);
  await expect(page.getByTestId("tvCanvas")).toBeVisible({ timeout: 10000 });

  const stranger = await newDevicePage(browser);
  await stranger.goto("/device");
  await expect(stranger).toHaveURL(/\/connect$/, { timeout: 10000 });
});
