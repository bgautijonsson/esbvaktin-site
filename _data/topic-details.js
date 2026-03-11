const fs = require("fs");
const path = require("path");

/**
 * Global data file that reads all JSON topic-detail files from _data/topic-details/
 * and makes them available as `topic-details` in all templates.
 */
module.exports = function () {
  const detailsDir = path.join(__dirname, "topic-details");

  if (!fs.existsSync(detailsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(detailsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  return files.map((f) => {
    const raw = fs.readFileSync(path.join(detailsDir, f), "utf-8");
    return JSON.parse(raw);
  });
};
