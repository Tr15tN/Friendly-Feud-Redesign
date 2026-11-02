import { expect, test } from "@playwright/test";
import fs from "fs";
import { PlayerType, Setup } from "./lib/Setup.js";
import { AdminPage } from "./models/AdminPage.js";

const SHOTS = process.env.DEMO_SHOTS ?? "";

test("a custom title replaces the default name instead of being added to it", async ({ browser }) => {
  const s = new Setup(browser);
  const host = await s.host();
  const spectator = await s.addPlayer(PlayerType.SPECTATOR);
  const admin = new AdminPage(host.page);
  const logo = spectator.page.locator("#titleLogoImg");
  const shot = async (name: string) => {
    if (!SHOTS) return;
    fs.mkdirSync(SHOTS, { recursive: true });
    await spectator.page.waitForTimeout(400);
    await spectator.page.screenshot({ path: `${SHOTS}/${name}.png` });
  };

  // Default brand: two words, no custom line.
  await expect(logo.locator("tspan:text-is('Friendly')").first()).toBeVisible();
  await expect(logo.locator("tspan:text-is('Feud')").first()).toBeVisible();
  await shot("logo-default");

  await admin.titleTextInput.fill("Tamme pere");
  await expect(logo).toContainText("Tamme");
  await expect(logo).not.toContainText("Friendly");
  await expect(logo).not.toContainText("Feud");
  await shot("logo-two-words");

  await admin.titleTextInput.fill("Pereõhtu");
  await expect(logo).toContainText("Pereõhtu");
  await expect(logo).not.toContainText("Friendly");
  await shot("logo-one-word");

  // Markup in a name is shown as text and never becomes part of the logo.
  await admin.titleTextInput.fill('<b id="evil">x</b>');
  await expect(logo).toContainText('x</b>');
  await expect(logo.locator("#evil")).toHaveCount(0);

  // Clearing it brings the default back.
  await admin.titleTextInput.fill("");
  await expect(logo).toContainText("Friendly");
});
