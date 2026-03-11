const { loadContentData } = require("../lib/content-data.js");

const content = loadContentData();

function ensureString(data, key, errors) {
  if (typeof data[key] !== "string" || !data[key].trim()) {
    errors.push(`missing "${key}"`);
  }
}

function ensureDateValue(data, key, errors) {
  const value = data[key];
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return;
  }

  if (typeof value === "string" && value.trim()) {
    return;
  }

  errors.push(`missing "${key}"`);
}

function validateReferences(values, lookup, key, errors) {
  if (!Array.isArray(values)) {
    errors.push(`"${key}" must be an array`);
    return;
  }

  const missing = values.filter((value) => !lookup[value]);
  if (missing.length) {
    errors.push(`unknown ${key}: ${missing.join(", ")}`);
  }
}

function validateBriefing(data) {
  if (!Array.isArray(data.tags) || !data.tags.includes("weekly-briefing")) {
    return;
  }

  const errors = [];
  const requiredStrings = [
    "title",
    "summary_deck",
    "what_changed",
    "claims_snapshot",
    "entities_snapshot",
    "althingi_snapshot",
    "method_note",
    "slug",
  ];

  requiredStrings.forEach((key) => ensureString(data, key, errors));
  ["date", "week_start", "week_end"].forEach((key) => ensureDateValue(data, key, errors));

  if (!Array.isArray(data.key_takeaways) || data.key_takeaways.length < 3 || data.key_takeaways.length > 5) {
    errors.push('"key_takeaways" must contain 3 to 5 items');
  }

  const from = new Date(data.week_start);
  const to = new Date(data.week_end);
  if (!Number.isNaN(from.valueOf()) && !Number.isNaN(to.valueOf()) && from > to) {
    errors.push('"week_start" must be on or before "week_end"');
  }

  validateReferences(data.linked_reports, content.lookups.reportsBySlug, "linked_reports", errors);
  validateReferences(data.linked_claims, content.lookups.claimsBySlug, "linked_claims", errors);
  validateReferences(data.linked_entities, content.lookups.entitiesBySlug, "linked_entities", errors);
  validateReferences(data.linked_evidence, content.lookups.evidenceById, "linked_evidence", errors);
  validateReferences(data.linked_debates, content.lookups.debatesBySlug, "linked_debates", errors);

  if (errors.length) {
    throw new Error(
      `Invalid weekly briefing "${data.inputPath || data.slug}": ${errors.join("; ")}`
    );
  }
}

module.exports = {
  eleventyComputed: {
    permalink: (data) => {
      if (!Array.isArray(data.tags) || !data.tags.includes("weekly-briefing")) {
        return data.permalink;
      }

      validateBriefing(data);

      return data.draft ? false : `/vikuyfirlit/${data.slug}/`;
    },
    eleventyExcludeFromCollections: (data) => {
      if (!Array.isArray(data.tags) || !data.tags.includes("weekly-briefing")) {
        return data.eleventyExcludeFromCollections;
      }

      return Boolean(data.draft);
    },
  },
};
