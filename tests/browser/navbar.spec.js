const { test } = require("./fixtures");
const { gotoAndWait, openMobileMenu, screenshotPath } = require("./helpers");

const readySelector = "#dt-results .dt-card";
const states = [
  { name: "navbar-390-closed", width: 390, height: 844, menuOpen: false },
  { name: "navbar-390-open", width: 390, height: 844, menuOpen: true },
  { name: "navbar-768-closed", width: 768, height: 900, menuOpen: false },
  { name: "navbar-768-open", width: 768, height: 900, menuOpen: true },
  { name: "navbar-960-closed", width: 960, height: 900, menuOpen: false },
  { name: "navbar-960-open", width: 960, height: 900, menuOpen: true },
  { name: "navbar-1024-inline", width: 1024, height: 900, menuOpen: false },
  { name: "navbar-1440-inline", width: 1440, height: 960, menuOpen: false },
];

test("capture navbar breakpoints and menu states", async ({ page }) => {
  for (const state of states) {
    await page.setViewportSize({ width: state.width, height: state.height });
    await gotoAndWait(page, "/umraedan/", readySelector);

    if (state.menuOpen) {
      await openMobileMenu(page);
    }

    await page.screenshot({
      path: screenshotPath(state.name),
    });
  }
});
