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
    // The event set is listed first, then the six older Estonian sets, plus the placeholder.
    await expect(selector.locator("option")).toHaveCount(8, { timeout: 10000 });
    await expect(selector.locator("optgroup").first()).toHaveAttribute("label", "Esiletõstetud mängud");
    await expect(selector.locator("optgroup").nth(1)).toHaveAttribute("label", "Klassikalised mängud");

    // The Rooside Sõda set: 6 answers on the first board, and the first answer is worth 25.
    await selector.selectOption({ label: "Rooside Sõda Keila Kool" });
    await page.getByTestId("startRoundOneButton").click();
    await expect(page.getByTestId("answer5PointsText")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("answer6PointsText")).toHaveCount(0);
    await expect(page.getByTestId("answer0PointsText")).toHaveText("25");
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
