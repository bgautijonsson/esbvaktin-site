const fs = require("fs");
const path = require("path");

const site = require("./site.json");
const trackerUtils = require("../assets/js/tracker-utils.js");

function readJson(relativePath) {
  const filePath = path.join(__dirname, "..", relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function getLatestDate(item, keys) {
  for (const key of keys) {
    if (item && item[key]) return item[key];
  }
  return "";
}

function sortByDateDesc(items, keys) {
  return [...items].sort((a, b) => {
    const dateA = getLatestDate(a, keys);
    const dateB = getLatestDate(b, keys);
    return dateB.localeCompare(dateA);
  });
}

function getDaysUntil(dateString) {
  const start = new Date();
  const todayUtc = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  );
  const target = new Date(dateString);
  const targetUtc = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate()
  );
  return Math.max(0, Math.ceil((targetUtc - todayUtc) / 86400000));
}

function normalizeReport(report, sourceLookup) {
  if (!report) return report;
  return trackerUtils.enrichReportRecord(report, sourceLookup);
}

function readOverviewDetail(slug) {
  try {
    return readJson(`_data/overviews/${slug}.json`);
  } catch {
    return null;
  }
}

function extractEditorialLead(editorial) {
  if (!editorial) return null;
  // Strip markdown heading, take first two paragraphs
  const paragraphs = editorial.replace(/^#[^\n]*\n+/, "").split(/\n\n+/).filter(Boolean);
  return paragraphs.slice(0, 2).join("\n\n");
}

module.exports = function () {
  const claims = readJson("assets/data/claims.json");
  const reportSourceLookup = trackerUtils.createNewsSourceLookup(claims);
  const reports = sortByDateDesc(
    readJson("assets/data/reports.json").map((report) => normalizeReport(report, reportSourceLookup)),
    ["analysis_date", "article_date"]
  );
  const debates = sortByDateDesc(readJson("assets/data/debates.json"), ["last_date", "first_date"]);
  const evidence = readJson("assets/data/evidence.json");
  const entities = readJson("assets/data/entities.json");
  const overviews = sortByDateDesc(readJson("assets/data/overviews.json"), ["period_start"]);
  const topics = readJson("assets/data/topics.json")
    .sort((a, b) => (b.published_claim_count || 0) - (a.published_claim_count || 0));

  const totalClaims = claims.length;
  const totalSpeeches = debates.reduce((sum, debate) => sum + (debate.speech_count || 0), 0);
  const uniqueSources = new Set(reports.map((report) => report.article_source).filter(Boolean));
  const latestReports = reports.slice(0, 3).map((report) => ({
    ...report,
    display_date: report.analysis_date || report.article_date,
  }));

  const topEntities = [...entities]
    .sort((a, b) => {
      const mentionDiff = (b.mention_count || 0) - (a.mention_count || 0);
      if (mentionDiff !== 0) return mentionDiff;
      const claimDiff = (b.claims?.length || 0) - (a.claims?.length || 0);
      if (claimDiff !== 0) return claimDiff;
      return (b.articles?.length || 0) - (a.articles?.length || 0);
    })
    .slice(0, 4)
    .map((entity) => ({
      ...entity,
      article_count: entity.articles?.length || 0,
      claim_count: entity.claims?.length || 0,
    }));

  const lastUpdated = sortByDateDesc(
    [
      { date: reports[0]?.analysis_date || reports[0]?.article_date },
      { date: debates[0]?.last_date },
      ...claims.map((claim) => ({ date: claim.last_verified })),
    ],
    ["date"]
  )[0]?.date || site.referendum_date;

  // Build rich weekly overview for homepage
  const latestOverviewSummary = overviews[0] || null;
  const overviewDetail = latestOverviewSummary
    ? readOverviewDetail(latestOverviewSummary.slug)
    : null;

  const weeklyReview = overviewDetail
    ? {
        slug: overviewDetail.slug,
        period_start: overviewDetail.period_start,
        period_end: overviewDetail.period_end,
        editorial_lead: extractEditorialLead(overviewDetail.editorial),
        articles_analysed: overviewDetail.key_numbers?.articles_analysed || 0,
        new_claims: overviewDetail.key_numbers?.new_claims_published || 0,
        verdict_breakdown: overviewDetail.key_numbers?.verdict_breakdown || {},
        key_facts: (overviewDetail.key_facts || []).slice(0, 3),
        source_breakdown: overviewDetail.source_breakdown || {},
        topic_activity: (overviewDetail.topic_activity || []).slice(0, 4),
      }
    : null;

  return {
    days_until_referendum: getDaysUntil(site.referendum_date),
    last_updated: lastUpdated,
    signal_stats: [
      {
        value: totalClaims,
        label: "fullyrðingar",
        href: "/fullyrdingar/",
        note: "úrskurðir skráðir",
      },
      {
        value: reports.length,
        label: "greiningar",
        href: "/umraedan/",
        note: `${uniqueSources.size} miðlar`,
      },
      {
        value: entities.length,
        label: "raddir",
        href: "/raddirnar/",
        note: "aðilar í safni",
      },
      {
        value: evidence.length,
        label: "heimildir",
        href: "/heimildir/",
        note: "gögn og frumheimildir",
      },
      {
        value: debates.length,
        label: "þingræður",
        href: "/thingraedur/",
        note: `${totalSpeeches.toLocaleString("is-IS")} ræður`,
      },
    ],
    processed_reports: latestReports,
    top_entities: topEntities,
    latest_overview: latestOverviewSummary,
    weekly_review: weeklyReview,
    top_topics: topics.slice(0, 6),
  };
};
