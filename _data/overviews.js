const fs = require("fs");
const path = require("path");

/* ── Icelandic slug (mirrors the isSlug filter in eleventy.config.js) ── */
function isSlug(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[áà]/g, "a")
    .replace(/[ðÐ]/g, "d")
    .replace(/[éè]/g, "e")
    .replace(/[íì]/g, "i")
    .replace(/[óò]/g, "o")
    .replace(/[úù]/g, "u")
    .replace(/[ýỳ]/g, "y")
    .replace(/[þÞ]/g, "th")
    .replace(/[æÆ]/g, "ae")
    .replace(/[öÖ]/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ── Build lookup map from a directory of JSON files, keyed by slug ── */
function buildLookup(dir) {
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
      if (data.slug) map.set(data.slug, data);
    } catch (_) {
      /* skip malformed files */
    }
  }
  return map;
}

/* ── Build claim lookup from claims.json, keyed by canonical_text_is ── */
function buildClaimLookup(dataDir) {
  const map = new Map();
  const claimsPath = path.join(dataDir, "assets", "data", "claims.json");
  if (!fs.existsSync(claimsPath)) return map;
  try {
    const claims = JSON.parse(fs.readFileSync(claimsPath, "utf-8"));
    for (const c of claims) {
      if (c.canonical_text_is) map.set(c.canonical_text_is, c);
    }
  } catch (_) {
    /* skip if malformed */
  }
  return map;
}

/* ── Enrich an overview with cross-referenced entity/report/claim data ── */
function enrichOverview(overview, entityMap, reportMap, claimMap) {
  // Enrich active_entities with detail data
  if (overview.active_entities) {
    overview.active_entities = overview.active_entities.map((ent) => {
      const detail = entityMap.get(ent.slug);
      if (!detail) return ent;
      return {
        ...ent,
        type: detail.type,
        stance: detail.stance,
        stance_score: detail.stance_score,
        credibility: detail.credibility,
        role: detail.role,
        party: detail.party,
        description: detail.description,
        scorecard: detail.scorecard,
        attribution_counts: detail.attribution_counts,
        article_count: (detail.articles || []).length,
        althingi_stats: detail.althingi_stats,
      };
    });
  }

  // Enrich articles with report data
  if (overview.articles) {
    overview.articles = overview.articles.map((art) => {
      const slug = isSlug(art.title);
      const report = reportMap.get(slug);
      if (!report) return { ...art, slug };
      return {
        ...art,
        slug,
        verdict_counts: report.verdict_counts,
        categories: report.categories,
        summary: report.summary,
        article_author: report.article_author,
        participants: (report.participants || []).map((p) => ({
          name: p.name,
          party: p.party,
          slug: p.slug,
        })),
        source_type: report.source_type,
      };
    });
  }

  // Enrich top_claims with full claim data (explanation, sightings, etc.)
  if (overview.top_claims) {
    overview.top_claims = overview.top_claims.map((claim) => {
      const full = claimMap.get(claim.canonical_text_is);
      if (!full) return claim;
      return {
        ...claim,
        claim_slug: full.claim_slug,
        explanation_is: full.explanation_is,
        missing_context_is: full.missing_context_is,
        confidence: full.confidence,
        canonical_text_en: full.canonical_text_en,
        sightings: (full.sightings || []).map((s) => ({
          source_title: s.source_title,
          source_url: s.source_url,
          source_type: s.source_type,
          source_date: s.source_date,
        })),
      };
    });
  }

  // Enrich notable_quotes speaker info from entity data
  if (overview.notable_quotes) {
    overview.notable_quotes = overview.notable_quotes.map((q) => {
      if (!q.speaker_slug) return q;
      const detail = entityMap.get(q.speaker_slug);
      if (!detail) return q;
      return {
        ...q,
        speaker_type: detail.type,
        speaker_role: detail.role,
        speaker_party: detail.party,
        speaker_stance: detail.stance,
        speaker_stance_score: detail.stance_score,
        speaker_credibility: detail.credibility,
      };
    });
  }

  return overview;
}

/**
 * Global data file that reads all JSON overview files from _data/overviews/
 * and enriches them with cross-referenced entity and report data.
 */
module.exports = function () {
  const detailsDir = path.join(__dirname, "overviews");

  if (!fs.existsSync(detailsDir)) {
    return [];
  }

  // Build lookup maps for enrichment
  const entityMap = buildLookup(path.join(__dirname, "entity-details"));
  const reportMap = buildLookup(path.join(__dirname, "reports"));
  const claimMap = buildClaimLookup(path.resolve(__dirname, ".."));

  const files = fs
    .readdirSync(detailsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  return files.map((f) => {
    const raw = fs.readFileSync(path.join(detailsDir, f), "utf-8");
    return enrichOverview(JSON.parse(raw), entityMap, reportMap, claimMap);
  });
};
