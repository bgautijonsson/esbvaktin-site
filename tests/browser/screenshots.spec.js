const { test } = require("./fixtures");
const { gotoAndWait, openMobileMenu, screenshotPath } = require("./helpers");

const desktopPages = [
  { name: "home-desktop", path: "/", selector: ".home-hero" },
  { name: "vikuyfirlit-desktop", path: "/vikuyfirlit/", selector: ".briefing-feature" },
  { name: "malefni-desktop", path: "/malefni/", selector: ".issue-topic-card" },
  { name: "malefni-detail-desktop", path: "/malefni/adildarferlid-og-hvad-er-kosid-um/", selector: ".issue-summary-panel" },
  { name: "spurt-og-svarad-desktop", path: "/spurningar-og-svor/", selector: ".faq-item" },
  { name: "ordaskyringar-desktop", path: "/ordaskyringar/", selector: ".glossary-section" },
  { name: "claims-desktop", path: "/fullyrdingar/", selector: "#ct-results .ct-card" },
  { name: "discourse-desktop", path: "/umraedan/", selector: "#dt-results .dt-card" },
  { name: "evidence-desktop", path: "/heimildir/", selector: ".ev-card" },
  { name: "speeches-desktop", path: "/thingraedur/", selector: "#st-results .st-card" },
];

const mobilePages = [
  { name: "home-mobile", path: "/", selector: ".home-hero" },
  { name: "malefni-detail-mobile", path: "/malefni/adildarferlid-og-hvad-er-kosid-um/", selector: ".issue-summary-panel" },
  { name: "spurt-og-svarad-mobile", path: "/spurningar-og-svor/", selector: ".faq-item" },
  { name: "claims-mobile", path: "/fullyrdingar/", selector: "#ct-results .ct-card" },
  { name: "discourse-mobile", path: "/umraedan/", selector: "#dt-results .dt-card" },
];

test("capture desktop browser pass screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });

  for (const shot of desktopPages) {
    await gotoAndWait(page, shot.path, shot.selector);
    await page.screenshot({
      path: screenshotPath(shot.name),
      fullPage: true,
    });
  }
});

test("capture mobile browser pass screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const shot of mobilePages) {
    await gotoAndWait(page, shot.path, shot.selector);
    await page.screenshot({
      path: screenshotPath(shot.name),
      fullPage: true,
    });
  }

  await gotoAndWait(page, "/", ".home-hero");
  await openMobileMenu(page);
  await page.screenshot({
    path: screenshotPath("home-mobile-menu-open"),
    fullPage: true,
  });
});
