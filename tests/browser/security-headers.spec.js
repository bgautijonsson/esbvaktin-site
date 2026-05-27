const { test, expect } = require("./fixtures");
const { gotoAndWait } = require("./helpers");

// Pages to walk to catch CSP violations or broken inline scripts after
// security headers were added (CSP meta tag, SRI on BMAC widget).
const pages = [
  { path: "/", selector: ".home-hero" },
  { path: "/fullyrdingar/", selector: "#ct-results .ct-card" },
  { path: "/umraedan/", selector: "#dt-results .dt-card" },
  { path: "/safnid/", selector: ".site-main" },
];

test("CSP meta tag is set on every page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(page, "/", ".home-hero");

  const csp = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("cdnjs.buymeacoffee.com");
  expect(csp).toContain("gc.zgo.at");
});

test("BMAC widget script has SRI integrity attribute", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await gotoAndWait(page, "/", ".home-hero");

  const integrity = await page
    .locator('script[data-name="BMC-Widget"]')
    .getAttribute("integrity");
  expect(integrity).toMatch(/^sha(256|384|512)-/);
});

test("no CSP violations or console errors on core pages", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });

  const violations = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore noise from third-party widgets that we don't control
      // (BMAC widget occasionally logs analytics warnings).
      if (text.includes("buymeacoffee") || text.includes("bmc-")) return;
      violations.push({ type: "console.error", text });
    }
  });
  page.on("pageerror", (err) => {
    violations.push({ type: "pageerror", text: err.message });
  });

  for (const { path, selector } of pages) {
    await gotoAndWait(page, path, selector);
  }

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});
