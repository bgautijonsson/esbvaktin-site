const fs = require("fs");
const path = require("path");

/**
 * Global data file that reads all JSON overview files from _data/overviews/
 * and makes them available as `overviews` in all templates.
 */
module.exports = function () {
  const detailsDir = path.join(__dirname, "overviews");

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
