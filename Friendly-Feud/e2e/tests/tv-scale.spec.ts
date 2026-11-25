import fs from "fs";
import { expect, Page, test } from "@playwright/test";
import { PlayerType, Setup } from "./lib/Setup.js";
import { AdminPage } from "./models/AdminPage.js";

const SHOTS = process.env.DEMO_SHOTS ?? "";
const FULL_HD = { width: 1920, height: 1080 };
const UHD_4K = { width: 3840, height: 2160 };

async function resizeTv(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  await page.waitForTimeout(2300); // the logo and boxes ease into their new size over 2 seconds
}

async function box(page: Page, selector: string) {
  const b = await page.locator(selector).first().boundingBox();
  expect(b, `${selector} is on screen`).not.toBeNull();
  return b!;
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test("a 4K TV shows the same picture as 1080p, just twice as sharp", async ({ browser }) => {
  test.setTimeout(120000);
  const s = new Setup(browser);
  const host = await s.host();
  await s.addPlayer();
  await s.addPlayer();
  const tv = await s.addPlayer(PlayerType.SPECTATOR);
  const admin = new AdminPage(host.page);

  // Title screen
  await resizeTv(tv.page, FULL_HD);
  const hdBoxes = await box(tv.page, "#titleBoxes");
  const hdLogo = await box(tv.page, "#titleLogoBox");
  const hdSignature = await box(tv.page, "#signature");
  await shot(tv.page, "tv-title-1080p");

  await resizeTv(tv.page, UHD_4K);
  await expect(tv.page.locator("#tvCanvas")).toHaveAttribute("data-scale", "2");
  const uhdBoxes = await box(tv.page, "#titleBoxes");
  const uhdLogo = await box(tv.page, "#titleLogoBox");
  const uhdSignature = await box(tv.page, "#signature");
  await shot(tv.page, "tv-title-4k");
  expect(uhdBoxes.width / hdBoxes.width).toBeCloseTo(2, 1);
  expect(uhdBoxes.height / hdBoxes.height).toBeCloseTo(2, 1);
  expect(uhdLogo.width / hdLogo.width).toBeCloseTo(2, 1);
  expect(uhdSignature.width / hdSignature.width).toBeCloseTo(2, 1);
  expect(uhdBoxes.x + uhdBoxes.width).toBeLessThanOrEqual(UHD_4K.width);
  expect(uhdBoxes.y + uhdBoxes.height).toBeLessThanOrEqual(UHD_4K.height);

  // Round board and Fast Money fill the same share of the screen at both sizes.
  await admin.gameSelector.selectOption({ index: 1 });
  await admin.startRoundOneButton.click();
  await host.page.locator("#question0Button").click();
  await expect(tv.page.locator("#tvCanvas")).toBeVisible();
  await resizeTv(tv.page, FULL_HD);
  const hdBoard = await box(tv.page, "#tvSafeArea > div > div");
  await resizeTv(tv.page, UHD_4K);
  const uhdBoard = await box(tv.page, "#tvSafeArea > div > div");
  await shot(tv.page, "tv-round-4k");
  expect(uhdBoard.width / hdBoard.width).toBeCloseTo(2, 1);
  expect(uhdBoard.x + uhdBoard.width).toBeLessThanOrEqual(UHD_4K.width);
  expect(uhdBoard.y + uhdBoard.height).toBeLessThanOrEqual(UHD_4K.height);

  await admin.openFlowMenu();
  await admin.finalRound.button.click();
  await expect(tv.page.locator("#finalRoundTitle")).toBeVisible();
  await resizeTv(tv.page, UHD_4K);
  await shot(tv.page, "tv-fastmoney-4k");
  const fast = await box(tv.page, "#finalRoundTitle");
  expect(fast.y).toBeGreaterThanOrEqual(0);
  const overflow = await tv.page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow.x).toBeLessThanOrEqual(0);
  expect(overflow.y).toBeLessThanOrEqual(0);
});

test("the TV size slider pulls the picture in from the edges without leaving a gap in the background", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const s = new Setup(browser);
  const host = await s.host();
  const tv = await s.addPlayer(PlayerType.SPECTATOR);
  const admin = new AdminPage(host.page);
  await admin.gameSelector.selectOption({ index: 1 });
  await resizeTv(tv.page, FULL_HD);

  const full = await box(tv.page, "#tvSafeArea");
  expect(full.width).toBeCloseTo(FULL_HD.width, 0);

  await host.page.locator("#displayScaleInput").fill("80");
  await expect(tv.page.locator("#tvCanvas")).toHaveAttribute("data-percent", "80", { timeout: 10000 });
  await tv.page.waitForTimeout(2300);
  const safe = await box(tv.page, "#tvSafeArea");
  const canvas = await box(tv.page, "#tvCanvas");
  expect(safe.width / canvas.width).toBeCloseTo(0.8, 2);
  expect(safe.height / canvas.height).toBeCloseTo(0.8, 2);
  expect(safe.x).toBeCloseTo(canvas.width * 0.1, 0);
  // The canvas itself (and its background) still reaches every edge of the TV.
  expect(canvas.x).toBe(0);
  expect(canvas.width).toBeCloseTo(FULL_HD.width, 0);
  expect(canvas.height).toBeCloseTo(FULL_HD.height, 0);
  // Everything that matters stays inside the smaller area.
  for (const id of ["titleLogoBox", "titleBoxes", "signature"]) {
    const b = await box(tv.page, `#${id}`);
    expect(b.x, `${id} left`).toBeGreaterThanOrEqual(safe.x - 1);
    expect(b.y, `${id} top`).toBeGreaterThanOrEqual(safe.y - 1);
    expect(b.x + b.width, `${id} right`).toBeLessThanOrEqual(safe.x + safe.width + 1);
    expect(b.y + b.height, `${id} bottom`).toBeLessThanOrEqual(safe.y + safe.height + 1);
  }
  await shot(tv.page, "tv-title-80");
  await shot(host.page, "tv-size-setting");

  // The board shrinks too, and Reset brings everything back.
  await admin.startRoundOneButton.click();
  await expect(tv.page.locator("#tvSafeArea > div > div")).toBeVisible();
  const board = await box(tv.page, "#tvSafeArea > div > div");
  expect(board.x + board.width).toBeLessThanOrEqual(safe.x + safe.width + 1);
  expect(board.y + board.height).toBeLessThanOrEqual(safe.y + safe.height + 1);

  await host.page.getByTestId("settingsDrawerButton").click();
  await host.page.locator("#displayScaleReset").click();
  await expect(tv.page.locator("#tvCanvas")).toHaveAttribute("data-percent", "100", { timeout: 10000 });
});
