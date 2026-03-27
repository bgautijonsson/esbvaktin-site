const fs = require("fs");
const path = require("path");

const taxonomy = require("../assets/js/site-taxonomy.js");
const trackerUtils = require("../assets/js/tracker-utils.js");

function readJson(relativePath) {
  const filePath = path.join(__dirname, "..", relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * Compute "Debate Delta" feed items from existing exported JSON.
 *
 * Item types:
 *   - NY GREINING   — new report (analysis) published
 *   - NY FULLYRÐING — new claim created
 *   - BRENNIDEPILL  — topic spiking (7d sighting count > 2× trailing 30d weekly avg)
 *   - ENDURVAKIN    — claim resurfaced after 14+ day gap
 */
module.exports = function () {
  const claims = readJson("assets/data/claims.json");
  const reports = readJson("assets/data/reports.json");
  const topics = readJson("assets/data/topics.json");

  const reportSourceLookup = trackerUtils.createNewsSourceLookup(claims);

  // Build URL→slug lookup so resurfaced claims can link to the report
  const reportSlugByUrl = {};
  for (const r of reports) {
    if (r.article_url) reportSlugByUrl[r.article_url] = r.slug;
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Cutoff: last 30 days for the full pool (we'll filter to 7d for default view)
  const cutoff30d = new Date(now);
  cutoff30d.setDate(cutoff30d.getDate() - 30);
  const cutoff30dStr = cutoff30d.toISOString().slice(0, 10);

  const cutoff7d = new Date(now);
  cutoff7d.setDate(cutoff7d.getDate() - 7);
  const cutoff7dStr = cutoff7d.toISOString().slice(0, 10);

  // For spiking: trailing 30d starts 7d ago
  const cutoff30dTrailing = new Date(now);
  cutoff30dTrailing.setDate(cutoff30dTrailing.getDate() - 37); // 30d window ending 7d ago
  const cutoff30dTrailingStr = cutoff30dTrailing.toISOString().slice(0, 10);

  const items = [];

  // ── New reports ──
  for (const report of reports) {
    const date = report.analysis_date || report.article_date;
    if (!date || date < cutoff30dStr) continue;

    const enriched = trackerUtils.enrichReportRecord(report, reportSourceLookup);

    items.push({
      type: "greining",
      typeLabel: "Ný greining",
      date,
      title: report.article_title,
      href: `/umraedan/${report.slug}/`,
      meta: [
        enriched.article_source,
        `${report.claim_count || 0} fullyrðingar`,
      ].filter(Boolean).join(" · "),
      verdict: dominantVerdict(report.verdict_counts),
      verdictLabel: dominantVerdict(report.verdict_counts)
        ? taxonomy.verdictLabel(dominantVerdict(report.verdict_counts))
        : null,
      category: report.dominant_category,
      categoryLabel: report.dominant_category
        ? taxonomy.categoryLabels[report.dominant_category] || report.dominant_category
        : null,
    });
  }

  // ── New claims (created in window) ──
  // Pick substantive ones to avoid flooding with trivial claims
  const newClaims = claims
    .filter((c) => {
      const created = (c.created_at || "").slice(0, 10);
      return created >= cutoff30dStr && c.substantive !== false;
    })
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  // Limit to most recent 15 substantive claims for the feed
  for (const claim of newClaims.slice(0, 15)) {
    const date = (claim.created_at || "").slice(0, 10);
    // Link to the report where this claim first appeared, or the topic page
    const firstSighting = (claim.sightings || [])[claim.sightings.length - 1];
    const claimReportSlug = firstSighting ? reportSlugByUrl[firstSighting.source_url] : null;
    const claimHref = claimReportSlug
      ? `/umraedan/${claimReportSlug}/`
      : `/malefni/${(claim.category || "").replace(/_/g, "-")}/`;

    items.push({
      type: "fullyrding",
      typeLabel: "Ný fullyrðing",
      date,
      title: claim.canonical_text_is,
      href: claimHref,
      meta: [
        claim.category ? taxonomy.categoryLabels[claim.category] || claim.category : null,
        claim.sighting_count ? `${claim.sighting_count} tilvísanir` : null,
      ].filter(Boolean).join(" · "),
      verdict: claim.verdict,
      verdictLabel: claim.verdict
        ? taxonomy.verdictLabel(claim.verdict, claim.epistemic_type)
        : null,
    });
  }

  // ── Spiking topics ──
  // Count sightings per topic in 7d vs trailing 30d
  const topic7d = {};
  const topic30dTrailing = {};
  for (const claim of claims) {
    const cat = claim.category;
    if (!cat) continue;
    for (const s of claim.sightings || []) {
      const d = s.source_date;
      if (!d) continue;
      if (d >= cutoff7dStr) {
        topic7d[cat] = (topic7d[cat] || 0) + 1;
      }
      if (d >= cutoff30dTrailingStr && d < cutoff7dStr) {
        topic30dTrailing[cat] = (topic30dTrailing[cat] || 0) + 1;
      }
    }
  }

  const topicLookup = Object.fromEntries(topics.map((t) => [t.slug, t]));

  for (const [cat, count7d] of Object.entries(topic7d)) {
    const trailing = topic30dTrailing[cat] || 0;
    const weeklyAvg = trailing / 4; // ~4 weeks in 30d
    if (weeklyAvg > 0 && count7d > 2 * weeklyAvg) {
      const topic = topicLookup[cat.replace(/_/g, "-")] || topicLookup[cat];
      const label = topic
        ? topic.label_is
        : taxonomy.categoryLabels[cat] || cat;
      const slug = topic ? topic.slug : cat.replace(/_/g, "-");

      items.push({
        type: "brennidepill",
        typeLabel: "Brennidepill",
        date: todayStr,
        title: label,
        href: `/malefni/${slug}/`,
        meta: `Mun umræddara en venjulega — ${count7d} tilvísanir síðustu 7 daga`,
        spikeRatio: count7d / weeklyAvg,
      });
    }
  }

  // ── Resurfaced claims ──
  for (const claim of claims) {
    const sightings = claim.sightings || [];
    if (sightings.length < 2) continue;

    const dates = [...new Set(sightings.map((s) => s.source_date).filter(Boolean))].sort();
    if (dates.length < 2) continue;

    const latest = dates[dates.length - 1];
    if (latest < cutoff7dStr) continue;

    const prev = dates[dates.length - 2];
    const gapDays = (new Date(latest) - new Date(prev)) / 86400000;
    if (gapDays < 14) continue;

    // Link to the report that resurfaced this claim, if we have it
    const latestSighting = sightings.find((s) => s.source_date === latest);
    const reportSlug = latestSighting ? reportSlugByUrl[latestSighting.source_url] : null;
    const href = reportSlug
      ? `/umraedan/${reportSlug}/`
      : `/malefni/${(claim.category || "").replace(/_/g, "-")}/`;

    items.push({
      type: "endurvakin",
      typeLabel: "Endurvakin",
      date: latest,
      title: claim.canonical_text_is,
      href,
      meta: [
        `${Math.round(gapDays)} daga hlé`,
        claim.category ? taxonomy.categoryLabels[claim.category] || claim.category : null,
      ].filter(Boolean).join(" · "),
      verdict: claim.verdict,
      verdictLabel: claim.verdict
        ? taxonomy.verdictLabel(claim.verdict, claim.epistemic_type)
        : null,
      gapDays: Math.round(gapDays),
    });
  }

  // ── Sort all items reverse-chronological ──
  items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // ── Counts for anchor slab (computed before truncation) ──
  const counts = {
    claims: items.filter((i) => i.type === "fullyrding" && i.date >= cutoff7dStr).length,
    reports: items.filter((i) => i.type === "greining" && i.date >= cutoff7dStr).length,
    spiking: items.filter((i) => i.type === "brennidepill").length,
    resurfaced: items.filter((i) => i.type === "endurvakin" && i.date >= cutoff7dStr).length,
  };

  // ── Separate timeline items from sidebar-only items ──
  // Brennidepill (spiking topics) are weekly trends, not daily events.
  // They go in the sidebar only. The timeline shows dated events.
  const spiking = items.filter((i) => i.type === "brennidepill");
  const timelinePool = items.filter((i) => i.type !== "brennidepill");

  // ── Interleave event types for a varied feed, then cap at 30 ──
  const byType = {
    greining: timelinePool.filter((i) => i.type === "greining"),
    endurvakin: timelinePool.filter((i) => i.type === "endurvakin"),
    fullyrding: timelinePool.filter((i) => i.type === "fullyrding"),
  };

  const MAX_ITEMS = 30;
  const feed = [];
  const pools = ["greining", "endurvakin", "fullyrding"];
  const cursors = { greining: 0, endurvakin: 0, fullyrding: 0 };

  while (feed.length < MAX_ITEMS) {
    let added = false;
    for (const pool of pools) {
      if (cursors[pool] < byType[pool].length && feed.length < MAX_ITEMS) {
        feed.push(byType[pool][cursors[pool]++]);
        added = true;
      }
    }
    if (!added) break;
  }

  // Re-sort the feed chronologically
  feed.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // ── Group by date ──
  const grouped = [];
  let currentDate = null;
  let currentGroup = null;
  for (const item of feed) {
    if (item.date !== currentDate) {
      currentDate = item.date;
      currentGroup = { date: currentDate, items: [] };
      grouped.push(currentGroup);
    }
    currentGroup.items.push(item);
  }

  // Counts from the actual feed
  const feedCounts = {
    claims: feed.filter((i) => i.type === "fullyrding").length,
    reports: feed.filter((i) => i.type === "greining").length,
    spiking: spiking.length,
    resurfaced: feed.filter((i) => i.type === "endurvakin").length,
  };

  return {
    items: feed,
    spiking,
    grouped,
    counts: feedCounts,
    cutoff7d: cutoff7dStr,
    cutoff30d: cutoff30dStr,
    generatedAt: now.toISOString(),
  };
};

function dominantVerdict(verdictCounts) {
  if (!verdictCounts) return null;
  let max = 0;
  let dominant = null;
  for (const [v, count] of Object.entries(verdictCounts)) {
    if (count > max) {
      max = count;
      dominant = v;
    }
  }
  return dominant;
}
