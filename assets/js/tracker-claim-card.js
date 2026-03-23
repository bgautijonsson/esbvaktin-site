/**
 * ESBvaktin Shared Claim Card — Rendering and interaction for claim cards.
 *
 * Used by both claim-tracker.js (full page) and topic-claim-tracker.js (embedded).
 * Depends on: ESBvaktinTaxonomy, ESBvaktinTrackerUtils
 */
(function (root, factory) {
  var claimCard = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = claimCard;
  }
  root.ESBvaktinClaimCard = claimCard;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TAXONOMY = (typeof globalThis !== "undefined" && globalThis.ESBvaktinTaxonomy) || {};
  var utils = (typeof globalThis !== "undefined" && globalThis.ESBvaktinTrackerUtils) || {};

  var VERDICT_LABELS = TAXONOMY.verdictLabels || {};
  var VERDICT_DESCRIPTIONS = TAXONOMY.verdictDescriptions || {};
  var VERDICT_CLASSES = TAXONOMY.verdictClasses || {};
  var CATEGORY_LABELS = TAXONOMY.categoryLabels || {};
  var SOURCE_TYPE_LABELS = TAXONOMY.claimSourceTypeLabels || {};

  var escapeHtml = utils.escapeHtml || function (v) { return String(v ?? ""); };
  var findReportForSource = utils.findReportForSource || function () { return null; };
  var buildReturnUrl = utils.buildReturnUrl || function () { return ""; };
  var withReturnUrl = utils.withReturnUrl || function (url) { return url; };

  var EVIDENCE_ID_RE = /\b([A-Z]+-[A-Z]+-\d+)\b/g;
  function linkifyEvidenceIds(html) {
    return html.replace(
      EVIDENCE_ID_RE,
      function (_, id) {
        return '<a href="/heimildir/' + id.toLowerCase() + '/" class="evidence-link" data-evidence-id="' + id + '">' + id + '</a>';
      }
    );
  }

  /**
   * Render a claim card.
   * @param {Object} claim - The claim data object
   * @param {Object} opts - Options bag
   * @param {string} [opts.focusedSlug] - Slug of the focused claim (for highlight)
   * @param {Object} [opts.reportLookup] - Report lookup for sighting→report matching
   * @returns {string} HTML string
   */
  function renderClaimCard(claim, opts) {
    opts = opts || {};
    var cardId = "ct-claim-" + claim.claim_slug;
    var verdictClass = VERDICT_CLASSES[claim.verdict] || "";
    var verdictLabel = VERDICT_LABELS[claim.verdict] || claim.verdict;
    var categoryLabel = CATEGORY_LABELS[claim.category] || claim.category;
    var confidencePct = Math.round((claim.confidence || 0) * 100);
    var isFocused = opts.focusedSlug === claim.claim_slug;
    var reportLookup = opts.reportLookup;

    var detailsHtml = "";
    if (claim.explanation_is) {
      detailsHtml += '<div class="ct-detail"><strong>Útskýring:</strong> ' + linkifyEvidenceIds(escapeHtml(claim.explanation_is)) + '</div>';
    }
    if (claim.missing_context_is) {
      detailsHtml += '<div class="ct-detail"><strong>Samhengi sem vantar:</strong> ' + linkifyEvidenceIds(escapeHtml(claim.missing_context_is)) + '</div>';
    }
    if (claim.canonical_text_en) {
      detailsHtml += '<div class="ct-detail ct-english"><strong>English:</strong> ' + escapeHtml(claim.canonical_text_en) + '</div>';
    }

    var supportingEvidence = claim.supporting_evidence || [];
    var contradictingEvidence = claim.contradicting_evidence || [];
    if (supportingEvidence.length > 0 || contradictingEvidence.length > 0) {
      var renderEvidenceLinks = function (evidenceList) {
        return evidenceList
          .map(function (evidence) {
            return '<a href="' + escapeHtml(withReturnUrl("/heimildir/" + evidence.slug + "/", buildReturnUrl(cardId))) + '" class="evidence-link" data-evidence-id="' + escapeHtml(evidence.id) + '" data-evidence-source="' + escapeHtml(evidence.source_name) + '">' + escapeHtml(evidence.id) + '</a>';
          })
          .join(", ");
      };

      var evidenceHtml = '<div class="ct-detail ct-evidence">';
      if (supportingEvidence.length > 0) {
        evidenceHtml += '<div class="ct-evidence-group"><strong>Heimildir:</strong> ' + renderEvidenceLinks(supportingEvidence) + '</div>';
      }
      if (contradictingEvidence.length > 0) {
        evidenceHtml += '<div class="ct-evidence-group ct-evidence-contra"><strong>Andstæðar heimildir:</strong> ' + renderEvidenceLinks(contradictingEvidence) + '</div>';
      }
      evidenceHtml += "</div>";
      detailsHtml += evidenceHtml;
    }

    if (claim.sightings && claim.sightings.length) {
      var sightingCount = claim.sightings.length;
      var sightingItems = claim.sightings
        .map(function (sighting) {
          var typeLabel = SOURCE_TYPE_LABELS[sighting.source_type] || sighting.source_type || "";
          var dateStr = sighting.source_date || "";
          var title = sighting.source_title || sighting.source_url;
          var meta = [typeLabel, dateStr].filter(Boolean).join(" · ");
          var matchedReport = reportLookup ? findReportForSource(sighting, reportLookup) : null;
          var internalHref = matchedReport && matchedReport.slug
            ? withReturnUrl("/umraedan/" + matchedReport.slug + "/", buildReturnUrl(cardId))
            : "";
          var href = internalHref || sighting.source_url || "";
          var externalAttrs = internalHref ? "" : ' target="_blank" rel="noopener"';
          var linkClass = internalHref
            ? "ct-sighting-link"
            : "ct-sighting-link ct-sighting-link--external";

          var titleHtml = href
            ? '<a href="' + escapeHtml(href) + '" class="' + linkClass + '"' + externalAttrs + '>' + escapeHtml(title) + '</a>'
            : '<span class="' + linkClass + '">' + escapeHtml(title) + '</span>';

          return '<li class="ct-sighting-item">' +
            titleHtml +
            (meta ? '<span class="ct-sighting-meta">' + escapeHtml(meta) + '</span>' : "") +
            '</li>';
        })
        .join("");

      detailsHtml += '<div class="ct-sightings-section">' +
        '<button class="ct-sightings-toggle" aria-expanded="false" type="button">' +
          '<span class="ct-sightings-label">Birtist í ' + sightingCount + ' umræðu' + (sightingCount > 1 ? 'm' : '') + '</span>' +
          '<span class="ct-sightings-expand-icon">▸</span>' +
        '</button>' +
        '<div class="ct-sightings-details">' +
          '<ul class="ct-sighting-list">' + sightingItems + '</ul>' +
        '</div>' +
      '</div>';
    }

    var sightingBadge =
      claim.sighting_count > 0
        ? '<span class="ct-sighting-count" title="Fjöldi tilvitana">' + claim.sighting_count + '×</span>'
        : "";

    return '<div class="ct-card' + (isFocused ? " ct-card--focused" : "") + '" id="' + escapeHtml(cardId) + '" data-slug="' + escapeHtml(claim.claim_slug) + '">' +
      '<div class="ct-card-header" role="button" tabindex="0" aria-expanded="false">' +
        '<div class="ct-card-main">' +
          '<span class="ct-verdict-pill ' + verdictClass + '" title="' + (VERDICT_DESCRIPTIONS[claim.verdict] || "") + '">' + verdictLabel + '</span>' +
          '<span class="ct-category-tag">' + categoryLabel + '</span>' +
          sightingBadge +
        '</div>' +
        '<p class="ct-claim-text">' + escapeHtml(claim.canonical_text_is) + '</p>' +
        '<div class="ct-card-meta">' +
          '<span class="ct-confidence" title="Vissustig">' +
            '<span class="ct-confidence-bar" style="width: ' + confidencePct + '%"></span>' +
            confidencePct + '%' +
          '</span>' +
          '<span class="ct-expand-icon">▸</span>' +
        '</div>' +
      '</div>' +
      '<div class="ct-card-details">' + detailsHtml + '</div>' +
    '</div>';
  }

  function toggleClaimCard(header) {
    var card = header.closest(".ct-card");
    if (!card) return;
    var expanded = !card.classList.contains("ct-expanded");
    card.classList.toggle("ct-expanded", expanded);
    header.setAttribute("aria-expanded", expanded);
  }

  function toggleSightings(toggle) {
    var section = toggle.closest(".ct-sightings-section");
    if (!section) return;
    var expanded = !section.classList.contains("ct-sightings-expanded");
    section.classList.toggle("ct-sightings-expanded", expanded);
    toggle.setAttribute("aria-expanded", expanded);
  }

  return {
    renderClaimCard: renderClaimCard,
    toggleClaimCard: toggleClaimCard,
    toggleSightings: toggleSightings,
    linkifyEvidenceIds: linkifyEvidenceIds,
  };
});
