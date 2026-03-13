/**
 * Generate a 1200×630 social card PNG using Playwright.
 * Run: node tools/generate-social-card.js
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    background: linear-gradient(135deg, #0c1929 0%, #162d50 50%, #1a3a5c 100%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    color: #fff;
    position: relative;
    overflow: hidden;
  }
  /* Subtle grid pattern */
  body::before {
    content: "";
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .content { position: relative; z-index: 1; text-align: center; padding: 0 80px; }
  .icon { font-size: 64px; margin-bottom: 24px; }
  h1 { font-size: 72px; font-weight: 800; letter-spacing: -1px; margin-bottom: 16px; }
  .tagline {
    font-size: 28px; font-weight: 400; color: rgba(255,255,255,0.8);
    line-height: 1.4; max-width: 800px;
  }
  .badge {
    margin-top: 32px;
    display: inline-block;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;
    padding: 10px 24px;
    font-size: 18px; font-weight: 500;
    color: rgba(255,255,255,0.9);
    letter-spacing: 0.5px;
  }
  .url {
    position: absolute; bottom: 32px; right: 48px;
    font-size: 22px; font-weight: 500;
    color: rgba(255,255,255,0.5);
  }
</style>
</head>
<body>
  <div class="content">
    <div class="icon">🇮🇸 🇪🇺</div>
    <h1>ESB Vaktin</h1>
    <p class="tagline">Óháð, gagnadrifið upplýsingaverkefni um ESB-þjóðaratkvæðagreiðsluna</p>
    <div class="badge">Fullyrðingar · Greiningar · Heimildir · Þingræður</div>
  </div>
  <div class="url">esbvaktin.is</div>
</body>
</html>`;

(async () => {
  const outPath = path.resolve(__dirname, "../assets/img/social-card.png");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(HTML, { waitUntil: "networkidle" });
  await page.screenshot({ path: outPath, type: "png" });
  await browser.close();
  console.log(`Social card saved to ${outPath}`);
})();
