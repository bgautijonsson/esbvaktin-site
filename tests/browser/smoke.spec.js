const { test, expect } = require("./fixtures");
const { gotoAndWait, openMobileMenu } = require("./helpers");

const pageChecks = [
  { path: "/", selector: ".home-hero", title: "ESB Vaktin" },
  { path: "/vikuyfirlit/", selector: ".ov-card", title: "Vikuyfirlit" },
  { path: "/malefni/", selector: ".tp-card", title: "Málefni" },
  {
    path: "/fullyrdingar/",
    selector: "#ct-results .ct-card",
    title: "Fullyrðingavakt",
  },
  { path: "/umraedan/", selector: "#dt-results .dt-card", title: "Umræðan" },
  { path: "/heimildir/", selector: ".ev-card", title: "Heimildir" },
  { path: "/raddirnar/", selector: "#et-results .et-card", title: "Raddirnar" },
  {
    path: "/thingraedur/",
    selector: "#st-results .st-card",
    title: "Þingræður um ESB",
  },
];

test("desktop navbar shows flat 5-item nav", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(page, "/", ".home-hero");
  const nav = page.locator(".site-nav");

  await expect(nav.locator(".nav-toggle")).toBeHidden();
  await expect(nav.locator(".nav-list")).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Nýtt", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Fullyrðingar", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Umræðan", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Málefni", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Safnið", exact: true }),
  ).toBeVisible();
});

test("mobile navbar opens flat menu and closes with escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndWait(page, "/", ".home-hero");

  const nav = page.locator(".site-nav");
  const toggle = nav.locator(".nav-toggle");
  const menu = nav.locator(".site-menu");

  await expect(toggle).toBeVisible();
  await expect(menu).toBeHidden();

  await openMobileMenu(page);

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    menu.getByRole("link", { name: "Nýtt", exact: true }),
  ).toBeVisible();
  await expect(
    menu.getByRole("link", { name: "Safnið", exact: true }),
  ).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(menu).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("core public pages render their main content", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });

  for (const check of pageChecks) {
    await gotoAndWait(page, check.path, check.selector);
    await expect(page).toHaveTitle(new RegExp(check.title));
  }
});

test("listing pages can reach representative detail pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });

  await gotoAndWait(page, "/umraedan/", "#dt-results .dt-card-link");
  await page.locator("#dt-results .dt-card-link").first().click();
  await expect(page.locator(".report-header")).toBeVisible();
  await expect(page).toHaveURL(/\/umraedan\/.+\/\?return=/);

  await gotoAndWait(page, "/heimildir/", ".ev-card");
  await page.locator(".ev-card").first().click();
  await expect(page.locator(".ev-back")).toBeVisible();
  await expect(page).toHaveURL(/\/heimildir\/.+\/\?return=/);

  await gotoAndWait(page, "/raddirnar/", "#et-results .et-card-link");
  await page.locator("#et-results .et-card-link").first().click();
  await expect(page.locator(".ed-back")).toBeVisible();
  await expect(page).toHaveURL(/\/raddirnar\/.+\/\?return=/);

  await gotoAndWait(page, "/thingraedur/", "#st-results .st-card-link");
  await page.locator("#st-results .st-card-link").first().click();
  await expect(page.locator(".dd-back")).toBeVisible();
  await expect(page).toHaveURL(/\/thingraedur\/.+\/\?return=/);

  await gotoAndWait(page, "/malefni/", ".tp-card-link");
  await page.locator(".tp-card-link").first().click();
  await expect(page.locator(".td-back")).toBeVisible();
  await expect(page).toHaveURL(/\/malefni\/.+\/\?return=/);

  await gotoAndWait(page, "/vikuyfirlit/", ".ov-card-link");
  await page.locator(".ov-card-link").first().click();
  await expect(page.locator(".od-back")).toBeVisible();
  await expect(page).toHaveURL(/\/vikuyfirlit\/.+\/\?return=/);
});

test("claim tracker article links prefer internal reports and preserve the original source on the report page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(page, "/fullyrdingar/", "#ct-results .ct-card");

  await page.locator("#ct-search").fill("varanlegar almennar undanþágur");
  const card = page.locator("#ct-results .ct-card").first();

  await expect(card).toContainText("undanþágur");
  await card.locator(".ct-card-header").click();

  const sightingLink = card
    .locator('.ct-sighting-item a[href*="/umraedan/"]')
    .first();
  await expect(sightingLink).toBeVisible();
  await expect(sightingLink).toHaveAttribute(
    "href",
    /\/umraedan\/esb-pakkinn-er-galopinn\/\?return=/,
  );

  await sightingLink.click();

  await expect(page).toHaveURL(
    /\/umraedan\/esb-pakkinn-er-galopinn\/\?return=/,
  );
  await expect(page.locator(".report-header h1")).toContainText(
    "ESB-pakkinn er galopinn",
  );
  await expect(page.locator(".report-source-link")).toHaveAttribute(
    "href",
    /visir\.is\/g\/20262853296d\/esb-pakkinn-er-galopinn/,
  );
});

test("detail back links preserve list context and highlight the prior result", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });

  await gotoAndWait(page, "/umraedan/", "#dt-results .dt-card-link");
  await page.locator("#dt-search").fill("Trump");
  await expect(page.locator("#dt-active-filters")).toContainText("Leit: Trump");

  const firstCard = page.locator("#dt-results .dt-card").first();
  const cardId = await firstCard.getAttribute("id");
  expect(cardId).toBeTruthy();

  await firstCard.locator(".dt-card-link").click();
  await expect(page.locator(".report-back")).toBeVisible();
  await page.locator(".report-back").click();

  await expect(page.locator("#dt-search")).toHaveValue("Trump");
  await expect(page.locator("#dt-active-filters")).toContainText("Leit: Trump");
  await expect(page.locator(`#${cardId}`)).toHaveClass(/tracker-return-target/);
});

test("homepage keeps the front page focused on datasets and current activity", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });

  await gotoAndWait(page, "/", ".home-sidebar");
  await expect(page.locator(".home-signal-card")).toHaveCount(5);
  await expect(page.locator(".home-sidebar-section").first()).toContainText(
    "Oftast nefnd",
  );
  await expect(page.locator(".home-sidebar-section").nth(1)).toContainText(
    "Nýjustu greiningar",
  );
});

test("evidence links show a short preview on hover", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(
    page,
    "/umraedan/treystu-thjodinni-opid-bref-til-forsaetisradherra-islands/",
    ".report-toggle-all",
  );

  await page.getByRole("button", { name: "Opna allar" }).click();

  const link = page.locator(".report-evidence .evidence-link").first();
  const preview = page.locator(".evidence-preview");

  await expect(link).toBeVisible();
  await link.hover();

  await expect(preview).toBeVisible();
  await expect(preview).toContainText("SOV-DATA-006");
  await expect(preview).toContainText(/þjóðaratkvæðagreiðsla/i);
});

test("topic detail page loads embedded claim tracker", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(page, "/malefni/", ".tp-card-link");
  await page.locator(".tp-card-link").first().click();
  await expect(page.locator(".td-back")).toBeVisible();

  // Scroll to trigger lazy load of the claim tracker
  await page.locator("#topic-claim-tracker").scrollIntoViewIfNeeded();
  await page
    .locator("#topic-claim-tracker .ct-card")
    .first()
    .waitFor({ state: "visible", timeout: 10000 });

  // Verify claim cards rendered
  const cardCount = await page.locator("#topic-claim-tracker .ct-card").count();
  expect(cardCount).toBeGreaterThan(0);

  // Verify controls exist
  await expect(page.locator("#tct-search")).toBeVisible();
  await expect(page.locator("#tct-verdict")).toBeVisible();
  await expect(page.locator("#tct-sort")).toBeVisible();

  // Verify expand/collapse works
  const firstCard = page.locator("#topic-claim-tracker .ct-card").first();
  await firstCard.locator(".ct-card-header").click();
  await expect(firstCard).toHaveClass(/ct-expanded/);
});

test("topic detail timeline shows proportional 2026 bars", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(page, "/malefni/", ".tp-card-link");
  await page.locator(".tp-card-link").first().click();
  await expect(page.locator(".td-back")).toBeVisible();

  // Verify timeline structure
  const bars = page.locator(".td-timeline-bar");
  const barCount = await bars.count();

  if (barCount > 0) {
    // Bars should have left-positioned style (proportional)
    const firstBarStyle = await bars.first().getAttribute("style");
    expect(firstBarStyle).toContain("left:");

    // Day labels should exist
    await expect(page.locator(".td-label-day").first()).toBeVisible();

    // Month labels should exist
    await expect(page.locator(".td-label-month").first()).toBeVisible();
  }
});
