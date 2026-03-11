const fs = require("fs");
const path = require("path");
const trackerUtils = require("../assets/js/tracker-utils.js");

/**
 * Global data file that reads all JSON report files from _data/reports/
 * and makes them available as `reports` in all templates.
 */
module.exports = function () {
  const reportsDir = path.join(__dirname, "reports");

  if (!fs.existsSync(reportsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(reportsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  return files.map((f) => {
    const raw = fs.readFileSync(path.join(reportsDir, f), "utf-8");
    const report = JSON.parse(raw);
    return {
      ...report,
      summary: trackerUtils.normalizeReportSummary(report.summary),
    };
  });
};
