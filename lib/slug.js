"use strict";

// Canonical Icelandic slug for the site — a mirror of the Python
// esbvaktin/src/esbvaktin/utils/slugify.py:icelandic_slugify(). The slug is the
// universal join key across the backend->site bridge (entity->report, evidence
// cited-by, /heimildir/{id}/ links), so the two implementations MUST agree.
// Parity is enforced by tests/slug-parity.test.js (here) AND tests/test_slug_parity.py
// (backend) against the same committed tests/fixtures/slug_parity.json fixture — drift
// in either repo fails a test. Keep them in lockstep.
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
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

module.exports = { isSlug };
