const fs = require("fs");
const path = require("path");

const site = require("./site.json");
const taxonomy = require("../assets/js/site-taxonomy.js");
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

function getPrimaryVerdict(report) {
  const counts = report.verdict_counts || {};
  const order = [
    "supported",
    "partially_supported",
    "unverifiable",
    "misleading",
    "unsupported",
  ];

  return order
    .map((verdict) => ({
      verdict,
      count: counts[verdict] || 0,
    }))
    .sort((a, b) => b.count - a.count)[0]?.verdict || null;
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

  const verdictCounts = {};
  Object.keys(taxonomy.verdictLabels).forEach((verdict) => {
    verdictCounts[verdict] = 0;
  });

  claims.forEach((claim) => {
    verdictCounts[claim.verdict] = (verdictCounts[claim.verdict] || 0) + 1;
  });

  const totalClaims = claims.length;
  const totalSpeeches = debates.reduce((sum, debate) => sum + (debate.speech_count || 0), 0);
  const totalWords = debates.reduce((sum, debate) => sum + (debate.total_words || 0), 0);
  const uniqueSources = new Set(reports.map((report) => report.article_source).filter(Boolean));
  const latestReports = reports.slice(0, 4).map((report) => {
    const primaryVerdict = getPrimaryVerdict(report);
    return {
      ...report,
      primary_verdict: primaryVerdict,
      primary_verdict_class: taxonomy.verdictClasses[primaryVerdict] || "",
      display_date: report.analysis_date || report.article_date,
    };
  });

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

  const verdictDistribution = Object.entries(taxonomy.verdictLabels).map(([verdict, label]) => {
    const count = verdictCounts[verdict] || 0;
    return {
      verdict,
      label,
      count,
      className: taxonomy.verdictClasses[verdict] || "",
      percentage: totalClaims ? Math.round((count / totalClaims) * 100) : 0,
    };
  });

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
    lead_report: latestReports[0] || null,
    processed_reports: latestReports.slice(0, 3),
    recent_reports: latestReports.slice(1),
    verdict_distribution: verdictDistribution,
    top_entities: topEntities,
    lead_debate: debates[0] || null,
    recent_debates: debates.slice(0, 3),
    total_speeches: totalSpeeches,
    total_words: totalWords,
    latest_overview: overviews[0] || null,
    top_topics: topics.slice(0, 6),
    coverage: {
      source_count: uniqueSources.size,
      claim_count: totalClaims,
      evidence_count: evidence.length,
      entity_count: entities.length,
      debate_count: debates.length,
    },
    timeline: [
      {
        title: "Síðasta gagnauppfærsla",
        date: lastUpdated,
        text: "Ný gögn og nýjustu greiningar renna inn á forsíðuna við hverja uppfærslu.",
      },
      {
        title: "Nýjasta greining",
        date: latestReports[0]?.display_date || lastUpdated,
        text: latestReports[0]
          ? latestReports[0].article_title
          : "Greiningar birtast hér um leið og þær fara í loftið.",
      },
      {
        title: "Þjóðaratkvæðagreiðsla",
        date: site.referendum_date,
        text: "29. ágúst 2026 kjósa landsmenn um næstu skref Íslands gagnvart Evrópusambandinu.",
      },
    ],
  };
};
