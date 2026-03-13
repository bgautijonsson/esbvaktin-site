const fs = require("fs");
const path = require("path");

/**
 * Provides filtered entity lists for comparison pages:
 *   comparison.parties — Icelandic political parties (with aggregate member verdicts)
 *   comparison.outlets — Icelandic media outlets
 */
module.exports = function () {
  const detailsDir = path.join(__dirname, "entity-details");

  if (!fs.existsSync(detailsDir)) {
    return { parties: [], outlets: [] };
  }

  const files = fs
    .readdirSync(detailsDir)
    .filter((f) => f.endsWith(".json"));

  // First pass: load all entities, index by slug
  const allEntities = {};
  const parties = [];
  const outlets = [];

  for (const f of files) {
    const raw = fs.readFileSync(path.join(detailsDir, f), "utf-8");
    const entity = JSON.parse(raw);
    allEntities[entity.slug] = entity;

    if (entity.type === "party" && entity.icelandic) {
      parties.push(entity);
    } else if (entity.subtype === "media" && entity.icelandic) {
      outlets.push(entity);
    }
  }

  // Second pass: aggregate member verdicts for each party
  const verdicts = [
    "supported",
    "partially_supported",
    "unverifiable",
    "unsupported",
    "misleading",
  ];

  for (const party of parties) {
    const agg = {};
    for (const v of verdicts) agg[v] = 0;

    // Sum scorecards from party members
    const members = party.party_members || [];
    for (const m of members) {
      const member = allEntities[m.slug];
      if (!member || !member.scorecard) continue;
      for (const v of verdicts) {
        agg[v] += member.scorecard[v] || 0;
      }
    }

    // Also include any direct party claims
    if (party.scorecard) {
      for (const v of verdicts) {
        agg[v] += party.scorecard[v] || 0;
      }
    }

    party.aggregate_scorecard = agg;
  }

  // Sort parties by stance_score (anti-EU first → pro-EU last)
  parties.sort((a, b) => (a.stance_score || 0) - (b.stance_score || 0));

  // Sort outlets by total claims descending
  outlets.sort(
    (a, b) =>
      (b.outlet_stats?.total_claims || 0) - (a.outlet_stats?.total_claims || 0),
  );

  return { parties, outlets };
};
