// @ts-check
import { expect, test } from "@playwright/test";
import { Setup } from "./lib/Setup.js";
import { AdminPage } from "./models/AdminPage.js";

test("the buzz times on a phone count from the first buzz, even after the host has done something", async ({
  browser,
}) => {
  const s = new Setup(browser);
  const host = (await s.host()).page;
  const admin = new AdminPage(host);
  const first = await s.addPlayer();
  const second = await s.addPlayer();
  await expect(admin.gameSelector.locator("option")).not.toHaveCount(1, { timeout: 15000 });
  await admin.gameSelector.selectOption({ index: 1 });
  await admin.startRoundOneButton.click();

  await first.page.getByTestId("buzzerButton").click();
  await second.page.getByTestId("buzzerButton").click();
  // Any host action moves the room's "last activity" time; it used to push the buzz times below zero.
  await admin.questions[0].click();

  const times = first.page.getByTestId("buzzedList0Time");
  await expect(times).toBeVisible({ timeout: 10000 });
  await expect(times).toHaveText(/^0 /);
  const next = first.page.getByTestId("buzzedList1Time");
  await expect(next).toBeVisible({ timeout: 10000 });
  await expect(next).not.toContainText("-");
});
