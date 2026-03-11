const fs = require("fs");
const path = require("path");

const taxonomy = require("../assets/js/site-taxonomy.js");

const ROOT = path.join(__dirname, "..");

let cached;

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf-8")
  );
}

function formatIsDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const months = [
    "janúar",
    "febrúar",
    "mars",
    "apríl",
    "maí",
    "júní",
    "júlí",
    "ágúst",
    "september",
    "október",
    "nóvember",
    "desember",
  ];

  return `${date.getUTCDate()}. ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function trimText(value, maxLength = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildClaimHref(claimSlug) {
  return `/fullyrdingar/?claim=${encodeURIComponent(claimSlug)}`;
}

function buildReportCard(report) {
  if (!report) return null;

  return {
    kind: "report",
    url: `/umraedan/${report.slug}/`,
    title: report.article_title,
    eyebrow: report.dominant_category
      ? taxonomy.categoryLabels[report.dominant_category] || report.dominant_category
      : "Greining",
    meta: [report.article_source, formatIsDate(report.analysis_date || report.article_date)].filter(Boolean),
    text: trimText(report.summary, 200),
    stats: report.claim_count ? `${report.claim_count.toLocaleString("is-IS")} fullyrðingar` : "",
  };
}

function buildClaimCard(claim) {
  if (!claim) return null;

  return {
    kind: "claim",
    url: buildClaimHref(claim.claim_slug),
    title: claim.canonical_text_is,
    eyebrow: taxonomy.categoryLabels[claim.category] || claim.category,
    meta: [
      taxonomy.verdictLabels[claim.verdict] || claim.verdict,
      claim.last_verified ? `Síðast staðfest ${formatIsDate(claim.last_verified)}` : "",
    ].filter(Boolean),
    text: trimText(claim.explanation_is || claim.missing_context_is || claim.canonical_text_is, 220),
    stats: claim.sighting_count ? `${claim.sighting_count.toLocaleString("is-IS")} tilvitnanir` : "",
  };
}

function buildEntityCard(entity) {
  if (!entity) return null;

  return {
    kind: "entity",
    url: `/raddirnar/${entity.slug}/`,
    title: entity.name,
    eyebrow: taxonomy.entityTypeLabels[entity.type] || entity.type,
    meta: [entity.party, entity.role].filter(Boolean),
    text: trimText(entity.description || entity.role || entity.name, 180),
    stats: [
      entity.claims?.length ? `${entity.claims.length.toLocaleString("is-IS")} fullyrðingar` : "",
      entity.articles?.length ? `${entity.articles.length.toLocaleString("is-IS")} greinar` : "",
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

function buildEvidenceCard(evidence) {
  if (!evidence) return null;

  return {
    kind: "evidence",
    url: `/heimildir/${evidence.slug}/`,
    title: evidence.evidence_id,
    eyebrow: taxonomy.categoryLabels[evidence.topic] || evidence.topic,
    meta: [
      taxonomy.evidenceSourceTypeLabels[evidence.source_type] || evidence.source_type,
      formatIsDate(evidence.source_date),
    ].filter(Boolean),
    text: trimText(evidence.statement_is || evidence.statement, 210),
    stats: evidence.source_name || "",
  };
}

function buildDebateCard(debate) {
  if (!debate) return null;

  const dateLabel = debate.first_date === debate.last_date
    ? formatIsDate(debate.last_date)
    : [formatIsDate(debate.first_date), formatIsDate(debate.last_date)].filter(Boolean).join(" – ");

  return {
    kind: "debate",
    url: `/thingraedur/${debate.slug}/`,
    title: debate.issue_title,
    eyebrow: `${debate.session}. löggjafarþing`,
    meta: [dateLabel].filter(Boolean),
    text: `${(debate.speech_count || 0).toLocaleString("is-IS")} ræður · ${(debate.speaker_count || 0).toLocaleString("is-IS")} þingmenn`,
    stats: debate.parties?.length ? `${debate.parties.length.toLocaleString("is-IS")} flokkar` : "",
  };
}

function buildLookup(items, key) {
  return Object.fromEntries(
    items
      .filter((item) => item && item[key])
      .map((item) => [item[key], item])
  );
}

function loadContentData() {
  if (cached) return cached;

  const claims = readJson("assets/data/claims.json");
  const reports = readJson("assets/data/reports.json");
  const entities = readJson("assets/data/entities.json");
  const evidence = readJson("assets/data/evidence.json");
  const debates = readJson("assets/data/debates.json");

  cached = {
    claims,
    reports,
    entities,
    evidence,
    debates,
    lookups: {
      claimsBySlug: buildLookup(claims, "claim_slug"),
      reportsBySlug: buildLookup(reports, "slug"),
      entitiesBySlug: buildLookup(entities, "slug"),
      evidenceById: buildLookup(evidence, "evidence_id"),
      debatesBySlug: buildLookup(debates, "slug"),
    },
  };

  return cached;
}

function resolveLinkedItems(list, lookup, buildCard) {
  return (Array.isArray(list) ? list : [])
    .map((value) => lookup[value])
    .filter(Boolean)
    .map(buildCard)
    .filter(Boolean);
}

function resolveLinkedContent(data) {
  const content = loadContentData();

  return {
    reports: resolveLinkedItems(data.linked_reports, content.lookups.reportsBySlug, buildReportCard),
    claims: resolveLinkedItems(data.linked_claims, content.lookups.claimsBySlug, buildClaimCard),
    entities: resolveLinkedItems(data.linked_entities, content.lookups.entitiesBySlug, buildEntityCard),
    evidence: resolveLinkedItems(data.linked_evidence, content.lookups.evidenceById, buildEvidenceCard),
    debates: resolveLinkedItems(data.linked_debates, content.lookups.debatesBySlug, buildDebateCard),
  };
}

module.exports = {
  buildClaimHref,
  buildClaimCard,
  buildDebateCard,
  buildEntityCard,
  buildEvidenceCard,
  buildReportCard,
  formatIsDate,
  loadContentData,
  resolveLinkedContent,
  trimText,
};
