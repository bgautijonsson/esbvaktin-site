const fs = require("fs");
const path = require("path");

/* ── Icelandic slug (mirrors the isSlug filter in eleventy.config.js) ── */
/* Also mirrors Python's icelandic_slugify() in src/esbvaktin/utils/slugify.py.
   NFKD decomposition handles non-Icelandic diacritics (e.g. Croatian č→c). */
function isSlug(str) {
  if (!str) return "";
  return str
    .replace(/[þÞ]/g, "th")
    .replace(/[ðÐ]/g, "d")
    .replace(/[æÆ]/g, "ae")
    .replace(/[öÖ]/g, "o")
    .replace(/[áÁà]/g, "a")
    .replace(/[éÉè]/g, "e")
    .replace(/[íÍì]/g, "i")
    .replace(/[óÓò]/g, "o")
    .replace(/[úÚù]/g, "u")
    .replace(/[ýÝỳ]/g, "y")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
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

/* ── Build claim lookups from claims.json ── */
function buildClaimLookups(dataDir) {
  const byText = new Map();
  const bySlug = new Map();
  const claimsPath = path.join(dataDir, "assets", "data", "claims.json");
  if (!fs.existsSync(claimsPath)) return { byText, bySlug };
  try {
    const claims = JSON.parse(fs.readFileSync(claimsPath, "utf-8"));
    for (const c of claims) {
      if (c.canonical_text_is) byText.set(c.canonical_text_is, c);
      if (c.claim_slug) bySlug.set(c.claim_slug, c);
    }
  } catch (_) {
    /* skip if malformed */
  }
  return { byText, bySlug };
}

/* ── Enrich an overview with cross-referenced entity/report/claim data ── */
function enrichOverview(overview, entityMap, reportMap, claimByText, claimBySlug) {
  // Enrich active_entities with detail data
  if (overview.active_entities) {
    overview.active_entities = overview.active_entities.map((ent) => {
      const detail = entityMap.get(ent.slug);
      if (!detail) {
        console.warn(`[overviews] Entity slug not found in entity-details: ${ent.slug} (${ent.name})`);
        return ent;
      }
      return {
        ...ent,
        type: detail.type,
        stance: detail.stance,
        stance_score: detail.stance_score,
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

  // Enrich articles with report data (prefer pre-computed slug from export)
  if (overview.articles) {
    overview.articles = overview.articles.map((art) => {
      const slug = art.slug || isSlug(art.title);
      const report = reportMap.get(slug);
      if (!report) {
        if (slug) console.warn(`[overviews] Report not found for article: ${slug} ("${art.title}")`);
        return { ...art, slug };
      }
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

  // Enrich top_claims with full claim data (prefer slug lookup, fall back to text)
  if (overview.top_claims) {
    overview.top_claims = overview.top_claims.map((claim) => {
      const full =
        (claim.claim_slug && claimBySlug.get(claim.claim_slug)) ||
        claimByText.get(claim.canonical_text_is);
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

  // Enrich key_facts with full claim data (prefer slug lookup, fall back to text)
  if (overview.key_facts) {
    overview.key_facts = overview.key_facts.map((fact) => {
      const full =
        (fact.claim_slug && claimBySlug.get(fact.claim_slug)) ||
        claimByText.get(fact.claim_text);
      if (!full) return fact;
      return {
        ...fact,
        claim_slug: fact.claim_slug || full.claim_slug,
        explanation: fact.explanation || full.explanation_is,
        caveat: fact.caveat || full.missing_context_is,
        confidence: fact.confidence ?? full.confidence,
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
  const { byText: claimByText, bySlug: claimBySlug } = buildClaimLookups(
    path.resolve(__dirname, "..")
  );

  const files = fs
    .readdirSync(detailsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  return files.map((f) => {
    const raw = fs.readFileSync(path.join(detailsDir, f), "utf-8");
    return enrichOverview(
      JSON.parse(raw),
      entityMap,
      reportMap,
      claimByText,
      claimBySlug
    );
  });
};
