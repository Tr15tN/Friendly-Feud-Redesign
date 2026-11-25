import fs from "fs";
import { expect, test } from "@playwright/test";
import { PlayerType, Setup } from "./lib/Setup.js";
import { AdminPage } from "./models/AdminPage.js";

const SHOTS = process.env.DEMO_SHOTS ?? "";

const SCREENS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "2560x1080", width: 2560, height: 1080 },
];

test("the title screen logo, team boxes and signature always fit the TV without scrolling", async ({ browser }) => {
  const s = new Setup(browser);
  const host = await s.host();
  await s.addPlayer();
  await s.addPlayer();
  const tv = await s.addPlayer(PlayerType.SPECTATOR);
  const admin = new AdminPage(host.page);
  await admin.titleTextInput.fill("Rooside Sõda: Keila Kool");

  for (const screen of SCREENS) {
    await tv.page.setViewportSize({ width: screen.width, height: screen.height });
    await tv.page.waitForTimeout(2300); // the size changes ease in over 2 seconds
    const box = async (id: string) => tv.page.locator(`#${id}`).boundingBox();
    const logo = await box("titleLogoBox");
    const boxes = await box("titleBoxes");
    expect(logo, `${screen.name}: logo`).not.toBeNull();
    expect(boxes, `${screen.name}: boxes`).not.toBeNull();
    expect(logo!.y, `${screen.name}: logo top`).toBeGreaterThanOrEqual(0);
    expect(logo!.x + logo!.width, `${screen.name}: logo right`).toBeLessThanOrEqual(screen.width + 1);
    expect(logo!.y + logo!.height, `${screen.name}: logo above boxes`).toBeLessThanOrEqual(boxes!.y + 1);
    expect(boxes!.y + boxes!.height, `${screen.name}: boxes bottom`).toBeLessThanOrEqual(screen.height);
    const sig = (await tv.page.locator("#signature").count()) > 0 ? await box("signature") : null;
    if (sig) {
      expect(sig.x + sig.width, `${screen.name}: signature right`).toBeLessThanOrEqual(screen.width);
      expect(sig.y + sig.height, `${screen.name}: signature bottom`).toBeLessThanOrEqual(screen.height);
      expect(sig.y, `${screen.name}: signature clear of the boxes`).toBeGreaterThanOrEqual(
        boxes!.y + boxes!.height - 1
      );
    }
    const overflow = await tv.page.evaluate(() => ({
      x: document.documentElement.scrollWidth - window.innerWidth,
      y: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(overflow.x, `${screen.name}: horizontal scroll`).toBeLessThanOrEqual(0);
    expect(overflow.y, `${screen.name}: vertical scroll`).toBeLessThanOrEqual(0);
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      await tv.page.screenshot({ path: `${SHOTS}/fit-${screen.name}.png` });
    }
  }
});

test("the signature with the year and build time shows on the home page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#signature")).toBeVisible();
  await expect(page.locator("#signatureStamp")).toContainText(/^2026 · \S+/);
});
