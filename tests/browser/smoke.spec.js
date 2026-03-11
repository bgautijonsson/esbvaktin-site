const { test, expect } = require("./fixtures");
const { gotoAndWait, openMobileMenu } = require("./helpers");

const pageChecks = [
  { path: "/", selector: ".home-hero", title: "ESBvaktin" },
  { path: "/fullyrdingar/", selector: "#ct-results .ct-card", title: "Fullyrðingavakt" },
  { path: "/umraedan/", selector: "#dt-results .dt-card", title: "Umræðan" },
  { path: "/heimildir/", selector: ".ev-card", title: "Heimildir" },
  { path: "/raddirnar/", selector: "#et-results .et-card", title: "Raddirnar" },
  { path: "/thingraedur/", selector: "#st-results .st-card", title: "Þingræður um ESB" },
];

test("desktop navbar keeps primary and utility links visible", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(page, "/", ".home-hero");
  const nav = page.locator(".site-nav");

  await expect(nav.locator(".nav-toggle")).toBeHidden();
  await expect(nav.locator(".nav-list--primary")).toBeVisible();
  await expect(nav.locator(".nav-list--utility")).toBeVisible();
  await expect(nav.getByRole("link", { name: "Fullyrðingar", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Aðferðafræði", exact: true })).toBeVisible();
  await expect(nav.getByRole("button", { name: "Sjálfvirkt" })).toBeVisible();
});

test("mobile navbar opens grouped menu and closes with escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoAndWait(page, "/", ".home-hero");

  const nav = page.locator(".site-nav");
  const toggle = nav.locator(".nav-toggle");
  const menu = nav.locator(".site-menu");

  await expect(toggle).toBeVisible();
  await expect(menu).toBeHidden();

  await openMobileMenu(page);

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(menu.getByText("Efni", { exact: true })).toBeVisible();
  await expect(menu.getByText("Upplýsingar", { exact: true })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Þingræður", exact: true })).toBeVisible();

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

test("listing pages can reach representative detail pages", async ({ page }) => {
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
});

test("claim tracker article links prefer internal reports and preserve the original source on the report page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(page, "/fullyrdingar/", "#ct-results .ct-card");

  await page.locator("#ct-search").fill("varanlegar almennar undanþágur");
  const card = page.locator("#ct-results .ct-card").first();

  await expect(card).toContainText("undanþágur");
  await card.locator(".ct-card-header").click();

  const sightingLink = card.locator('.ct-sighting-item a[href*="/umraedan/"]').first();
  await expect(sightingLink).toBeVisible();
  await expect(sightingLink).toHaveAttribute("href", /\/umraedan\/esb-pakkinn-er-galopinn\/\?return=/);

  await sightingLink.click();

  await expect(page).toHaveURL(/\/umraedan\/esb-pakkinn-er-galopinn\/\?return=/);
  await expect(page.locator(".report-header h1")).toContainText("ESB-pakkinn er galopinn");
  await expect(page.locator(".report-source-link")).toHaveAttribute(
    "href",
    /visir\.is\/g\/20262853296d\/esb-pakkinn-er-galopinn/
  );
});

test("detail back links preserve list context and highlight the prior result", async ({ page }) => {
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

test("evidence links show a short preview on hover", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(page, "/umraedan/treystu-thjodinni-opid-bref-til-forsaetisradherra-islands/", ".report-toggle-all");

  await page.getByRole("button", { name: "Opna allar" }).click();

  const link = page.locator(".report-evidence .evidence-link").first();
  const preview = page.locator(".evidence-preview");

  await expect(link).toBeVisible();
  await link.hover();

  await expect(preview).toBeVisible();
  await expect(preview).toContainText("SOV-DATA-006");
  await expect(preview).toContainText(/þjóðaratkvæðagreiðsla/i);
});
