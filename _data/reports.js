const fs = require("fs");
const path = require("path");
const trackerUtils = require("../assets/js/tracker-utils.js");

/**
 * Global data file that reads all JSON report files from _data/reports/
 * and makes them available as `reports` in all templates.
 */
module.exports = function () {
  const reportsDir = path.join(__dirname, "reports");
  const claimsPath = path.join(__dirname, "..", "assets", "data", "claims.json");

  if (!fs.existsSync(reportsDir)) {
    return [];
  }

  const sourceLookup = fs.existsSync(claimsPath)
    ? trackerUtils.createNewsSourceLookup(
        JSON.parse(fs.readFileSync(claimsPath, "utf-8"))
      )
    : null;

  const files = fs
    .readdirSync(reportsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  return files.map((f) => {
    const raw = fs.readFileSync(path.join(reportsDir, f), "utf-8");
    return trackerUtils.enrichReportRecord(JSON.parse(raw), sourceLookup);
  });
};
