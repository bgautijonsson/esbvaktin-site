const fs = require("fs");
const path = require("path");

module.exports = function () {
  const debatesDir = path.join(__dirname, "debates");
  if (!fs.existsSync(debatesDir)) return [];

  return fs
    .readdirSync(debatesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(debatesDir, f), "utf-8")))
    .sort((a, b) => {
      // Sort by last_date descending, then speech_count descending
      const dateA = a.last_date || "";
      const dateB = b.last_date || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.speech_count || 0) - (a.speech_count || 0);
    });
};
