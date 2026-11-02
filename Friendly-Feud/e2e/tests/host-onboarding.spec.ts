// @ts-check
import { expect, test } from "@playwright/test";

// A first-time host sees the walkthrough; automated browsers are normally skipped, so pretend to be a person here.
async function newHumanHost(browser: import("@playwright/test").Browser) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByTestId("hostRoomButton").click();
  await expect(page.getByTestId("roomCodeText")).toBeVisible({ timeout: 15000 });
  return { context, page };
}

test.describe("Host onboarding", () => {
  test("first-time host gets the tour, and can replay it from the Help menu", async ({ browser }) => {
    const { context, page } = await newHumanHost(browser);

    const tour = page.getByTestId("hostTour");
    await expect(tour).toBeVisible();
    await expect(tour).toContainText("Welcome, host");

    // The console behind the tour stays usable.
    await expect(page.getByTestId("gameSelector")).toBeVisible();

    await page.getByTestId("hostTourNext").click();
    await expect(tour).toContainText("Load a game");
    await page.getByTestId("hostTourBack").click();
    await expect(tour).toContainText("Welcome, host");

    for (let i = 0; i < 6; i++) await page.getByTestId("hostTourNext").click();
    await expect(tour).toContainText("Fast Money");
    await expect(tour.getByRole("link", { name: "Host quickstart" })).toBeVisible();
    await page.getByTestId("hostTourNext").click();
    await expect(tour).not.toBeVisible();

    // It does not come back after a reload, but the Help menu replays it.
    await page.reload();
    await expect(page.getByTestId("roomCodeText")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("hostTour")).not.toBeVisible();
    await page.getByTestId("helpMenuButton").click();
    await expect(page.getByTestId("quickstartLink")).toHaveAttribute("href", "/docs/en/quickstart");
    await page.getByTestId("startTourButton").click();
    await expect(page.getByTestId("hostTour")).toBeVisible();
    await page.getByTestId("hostTourSkip").click();
    await expect(page.getByTestId("hostTour")).not.toBeVisible();

    await context.close();
  });

  test("question sets are grouped and readable, and follow the language", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("hostRoomButton").click();
    await expect(page.getByTestId("roomCodeText")).toBeVisible({ timeout: 15000 });

    const selector = page.getByTestId("gameSelector");
    await expect(selector.locator("optgroup")).toHaveCount(2);
    await expect(selector.locator("optgroup").first()).toHaveAttribute("label", "Classic games");
    await expect(selector.locator("option", { hasText: /^Game 1$/ })).toHaveCount(1);
    await expect(selector).not.toContainText("games/en");

    await page.getByTestId("languageInput").selectOption("et");
    await expect(page.getByRole("heading", { name: "Seadista oma mäng" })).toBeVisible();
    // Only the six Estonian sets are offered, plus the placeholder.
    await expect(selector.locator("option")).toHaveCount(7, { timeout: 10000 });
    await expect(selector.locator("optgroup").first()).toHaveAttribute("label", "Klassikalised mängud");
  });

  test("the quickstart exists in English and Estonian", async ({ page }) => {
    await page.goto("/docs/en/quickstart");
    await expect(page.getByRole("heading", { level: 1, name: "Host quickstart" })).toBeVisible();
    await page.goto("/docs/et/quickstart");
    await expect(page.getByRole("heading", { level: 1, name: "Mängujuhi kiirjuhend" })).toBeVisible();
    await page.goto("/docs/et/guide");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("mängujuhend");
    await page.goto("/docs/et/help");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("abi");
  });
});
