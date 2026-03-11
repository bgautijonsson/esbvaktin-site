const { test } = require("./fixtures");
const { gotoAndWait, openMobileMenu, setStoredTheme, screenshotPath } = require("./helpers");

test("capture representative detail page screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });

  await gotoAndWait(page, "/umraedan/", "#dt-results .dt-card-link");
  await page.locator("#dt-results .dt-card-link").first().click();
  await page.locator(".report-header").waitFor({ state: "visible" });
  await page.screenshot({
    path: screenshotPath("details", "report-detail-desktop"),
    fullPage: true,
  });

  await gotoAndWait(page, "/heimildir/", ".ev-card");
  await page.locator(".ev-card").first().click();
  await page.locator(".ev-back").waitFor({ state: "visible" });
  await page.screenshot({
    path: screenshotPath("details", "evidence-detail-desktop"),
    fullPage: true,
  });

  await gotoAndWait(page, "/raddirnar/", "#et-results .et-card-link");
  await page.locator("#et-results .et-card-link").first().click();
  await page.locator(".ed-back").waitFor({ state: "visible" });
  await page.screenshot({
    path: screenshotPath("details", "entity-detail-desktop"),
    fullPage: true,
  });

  await gotoAndWait(page, "/thingraedur/", "#st-results .st-card-link");
  await page.locator("#st-results .st-card-link").first().click();
  await page.locator(".dd-back").waitFor({ state: "visible" });
  await page.screenshot({
    path: screenshotPath("details", "debate-detail-desktop"),
    fullPage: true,
  });
});

test("capture dark mode review screenshots", async ({ page }) => {
  await setStoredTheme(page, "dark");
  await page.setViewportSize({ width: 1440, height: 960 });

  await gotoAndWait(page, "/", ".home-hero");
  await page.screenshot({
    path: screenshotPath("dark", "home-desktop-dark"),
    fullPage: true,
  });

  await gotoAndWait(page, "/umraedan/", "#dt-results .dt-card");
  await page.screenshot({
    path: screenshotPath("dark", "discourse-desktop-dark"),
    fullPage: true,
  });

  await gotoAndWait(page, "/umraedan/", "#dt-results .dt-card-link");
  await page.locator("#dt-results .dt-card-link").first().click();
  await page.locator(".report-header").waitFor({ state: "visible" });
  await page.screenshot({
    path: screenshotPath("dark", "report-detail-desktop-dark"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndWait(page, "/", ".home-hero");
  await openMobileMenu(page);
  await page.screenshot({
    path: screenshotPath("dark", "home-mobile-menu-open-dark"),
    fullPage: true,
  });
});
