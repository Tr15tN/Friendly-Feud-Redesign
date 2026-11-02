import { test } from "@playwright/test";

test.use({ locale: "en-US" });

// Not part of the suite: renders the README hero image of the interactive demo (run with DEMO_SHOTS=<dir>).
test("demo hero screenshot", async ({ page }) => {
  test.skip(!process.env.DEMO_SHOTS, "only when rendering the README image");
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/demo");
  for (let i = 1; i < 8; i++) {
    await page.getByTestId("demoNext").click();
    await page.getByTestId("demoSkip").click({ timeout: 20000 }).catch(() => undefined);
    await page.getByTestId("demoReplay").waitFor({ timeout: 60000 });
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${process.env.DEMO_SHOTS}/demo-hero.png` });
});
