const fs = require("fs");
const path = require("path");

const SCREENSHOT_DIR = path.join(process.cwd(), "browser-artifacts", "screenshots");

async function gotoAndWait(page, pagePath, readySelector) {
  await page.goto(pagePath, { waitUntil: "domcontentloaded" });
  await page.locator(readySelector).first().waitFor({ state: "visible" });
}

async function openMobileMenu(page) {
  const toggle = page.locator(".nav-toggle");
  await toggle.click();
  await page.locator(".site-menu").waitFor({ state: "visible" });
}

async function setStoredTheme(page, theme) {
  await page.addInitScript((mode) => {
    if (mode === "system") {
      localStorage.removeItem("esb-theme");
      return;
    }

    localStorage.setItem("esb-theme", mode);
  }, theme);
}

function screenshotPath(...parts) {
  const finalPart = parts.pop();
  const filename = finalPart.endsWith(".png") ? finalPart : `${finalPart}.png`;
  const fullPath = path.join(SCREENSHOT_DIR, ...parts, filename);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  return fullPath;
}

module.exports = {
  gotoAndWait,
  openMobileMenu,
  setStoredTheme,
  screenshotPath,
};
