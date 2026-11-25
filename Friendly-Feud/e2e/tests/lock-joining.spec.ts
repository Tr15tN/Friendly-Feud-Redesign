// @ts-check
import { Browser, expect, Page, test } from "@playwright/test";
import { Setup } from "./lib/Setup.js";
import { AdminPage } from "./models/AdminPage.js";

async function tryJoin(browser: Browser, room: string, name: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await page.getByTestId("roomCodeInput").fill(room);
  await page.getByTestId("playerNameInput").fill(name);
  await page.getByTestId("joinRoomButton").click();
  return page;
}

test("'Lock joining' keeps new phones out, the host can reload, and it can be undone", async ({ browser }) => {
  const s = new Setup(browser);
  const host = await s.host();
  const room = s.roomCode as string;
  await new AdminPage(host.page).gameSelector.selectOption({ index: 1 });

  // Someone joins before the lock.
  const early = await s.addPlayer();

  await expect(host.page.getByTestId("lobbyRoster")).toContainText(early.name);
  await host.page.getByLabel("Lock joining").check();
  await expect(host.page.getByTestId("lobbyJoiningClosed")).toBeVisible();

  // A new phone is refused and stays on the home page.
  const troll = await tryJoin(browser, room, "Troll");
  await expect(troll.getByText("The host has closed this room to new players.")).toBeVisible({ timeout: 10000 });
  await expect(troll.getByTestId("joinRoomButton")).toBeVisible();
  await expect(host.page.getByTestId("lobbyRoster")).not.toContainText("Troll");

  // The host can still reload and get back into the locked room.
  await host.page.reload();
  await expect(host.page.getByTestId("lobbyJoiningClosed")).toBeVisible({ timeout: 10000 });
  await expect(early.page.getByTestId("quitButton")).toBeVisible();

  // Unlocking lets the next phone in.
  await host.page.getByLabel("Lock joining").uncheck();
  const late = await s.addPlayer();
  await expect(host.page.getByTestId("lobbyRoster")).toContainText(late.name, { timeout: 10000 });
});
