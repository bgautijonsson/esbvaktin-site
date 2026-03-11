(function () {
  "use strict";

  const LINK_SELECTOR = ".evidence-link";
  const TOOLTIP_ID = "evidence-preview-tooltip";
  const EVIDENCE_URL = "/assets/data/evidence.json";
  const viewportMargin = 12;
  const hoverSupported = typeof window.matchMedia === "function"
    ? window.matchMedia("(hover: hover)").matches
    : true;

  let activeLink = null;
  let evidenceMap = null;
  let loadPromise = null;

  const tooltip = document.createElement("div");
  tooltip.className = "evidence-preview";
  tooltip.id = TOOLTIP_ID;
  tooltip.hidden = true;
  tooltip.setAttribute("role", "tooltip");
  tooltip.innerHTML = [
    '<div class="evidence-preview__id"></div>',
    '<p class="evidence-preview__statement"></p>',
    '<div class="evidence-preview__source" hidden></div>',
  ].join("");

  const idEl = tooltip.querySelector(".evidence-preview__id");
  const statementEl = tooltip.querySelector(".evidence-preview__statement");
  const sourceEl = tooltip.querySelector(".evidence-preview__source");
  document.body.appendChild(tooltip);

  function normalizeWhitespace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function summarizeStatement(value) {
    const text = normalizeWhitespace(value);
    if (!text) return "";

    const sentenceMatch = text.match(/^(.{30,240}?[.!?])(?:\s|$)/);
    if (sentenceMatch) {
      return sentenceMatch[1];
    }

    if (text.length <= 260) {
      return text;
    }

    return `${text.slice(0, 257).replace(/\s+\S*$/, "")}…`;
  }

  function getLinkId(link) {
    const explicitId = normalizeWhitespace(link?.dataset?.evidenceId);
    if (explicitId) return explicitId.toUpperCase();

    const textId = normalizeWhitespace(link?.textContent);
    if (textId) return textId.toUpperCase();

    return "";
  }

  function getLinkSlug(link) {
    try {
      const url = new URL(link.href, window.location.origin);
      const match = url.pathname.match(/^\/heimildir\/([^/]+)\/?$/);
      return match ? match[1].toLowerCase() : "";
    } catch (_error) {
      return "";
    }
  }

  function setTooltipContent(options) {
    idEl.textContent = options.id || "";
    statementEl.textContent = options.statement || "Stutt samantekt fannst ekki.";

    if (options.source) {
      sourceEl.hidden = false;
      sourceEl.textContent = options.source;
    } else {
      sourceEl.hidden = true;
      sourceEl.textContent = "";
    }
  }

  function showTooltip(link) {
    if (activeLink && activeLink !== link) {
      activeLink.removeAttribute("aria-describedby");
    }

    activeLink = link;
    activeLink.setAttribute("aria-describedby", TOOLTIP_ID);
    tooltip.hidden = false;
    tooltip.classList.add("is-visible");
    positionTooltip(link);
  }

  function hideTooltip(link) {
    if (link && activeLink !== link) {
      return;
    }

    if (activeLink) {
      activeLink.removeAttribute("aria-describedby");
    }

    activeLink = null;
    tooltip.classList.remove("is-visible");
    tooltip.hidden = true;
  }

  function positionTooltip(link) {
    if (!link || tooltip.hidden) return;

    tooltip.style.left = `${viewportMargin}px`;
    tooltip.style.top = `${viewportMargin}px`;

    const rect = link.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const centerX = rect.left + (rect.width / 2) - (width / 2);
    const left = Math.max(viewportMargin, Math.min(centerX, window.innerWidth - width - viewportMargin));
    const belowTop = rect.bottom + 10;
    const fitsBelow = belowTop + height <= window.innerHeight - viewportMargin;
    const top = fitsBelow
      ? belowTop
      : Math.max(viewportMargin, rect.top - height - 10);

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  function buildEvidenceMap(items) {
    const map = new Map();

    for (const item of items || []) {
      if (item?.evidence_id) {
        map.set(String(item.evidence_id).toUpperCase(), item);
      }

      if (item?.slug) {
        map.set(String(item.slug).toLowerCase(), item);
      }
    }

    return map;
  }

  function loadEvidenceMap() {
    if (evidenceMap) return Promise.resolve(evidenceMap);
    if (loadPromise) return loadPromise;

    loadPromise = fetch(EVIDENCE_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load evidence index: ${response.status}`);
        }

        return response.json();
      })
      .then((items) => {
        evidenceMap = buildEvidenceMap(items);
        return evidenceMap;
      })
      .catch((error) => {
        console.error("Evidence preview: failed to load evidence index", error);
        evidenceMap = new Map();
        return evidenceMap;
      });

    return loadPromise;
  }

  function resolveEvidence(link, map) {
    const evidenceId = getLinkId(link);
    if (evidenceId && map.has(evidenceId)) {
      return map.get(evidenceId);
    }

    const slug = getLinkSlug(link);
    if (slug && map.has(slug)) {
      return map.get(slug);
    }

    return null;
  }

  function activateLink(link) {
    const sourceFallback = normalizeWhitespace(link.dataset.evidenceSource);
    const loadingId = getLinkId(link);

    if (evidenceMap) {
      const evidence = resolveEvidence(link, evidenceMap);
      setTooltipContent({
        id: evidence?.evidence_id || loadingId,
        statement: summarizeStatement(evidence?.statement_is || evidence?.statement) || "Stutt samantekt fannst ekki. Opnaðu heimildina til að lesa nánar.",
        source: evidence?.source_name || sourceFallback,
      });
      showTooltip(link);
      positionTooltip(link);
      return;
    }

    setTooltipContent({
      id: loadingId,
      statement: "Sæki stutta samantekt…",
      source: sourceFallback,
    });
    showTooltip(link);

    loadEvidenceMap().then((map) => {
      if (activeLink !== link) return;

      const evidence = resolveEvidence(link, map);
      setTooltipContent({
        id: evidence?.evidence_id || loadingId,
        statement: summarizeStatement(evidence?.statement_is || evidence?.statement) || "Stutt samantekt fannst ekki. Opnaðu heimildina til að lesa nánar.",
        source: evidence?.source_name || sourceFallback,
      });
      positionTooltip(link);
    });
  }

  document.addEventListener("mouseover", (event) => {
    if (!hoverSupported) return;

    const link = event.target instanceof Element ? event.target.closest(LINK_SELECTOR) : null;
    if (!link || activeLink === link) return;

    activateLink(link);
  });

  document.addEventListener("mouseout", (event) => {
    if (!hoverSupported) return;

    const link = event.target instanceof Element ? event.target.closest(LINK_SELECTOR) : null;
    if (!link) return;

    const nextLink = event.relatedTarget instanceof Element
      ? event.relatedTarget.closest(LINK_SELECTOR)
      : null;

    if (nextLink === link) return;
    hideTooltip(link);
  });

  document.addEventListener("focusin", (event) => {
    const link = event.target instanceof Element ? event.target.closest(LINK_SELECTOR) : null;
    if (!link) return;

    activateLink(link);
  });

  document.addEventListener("focusout", (event) => {
    const link = event.target instanceof Element ? event.target.closest(LINK_SELECTOR) : null;
    if (!link) return;

    const nextLink = event.relatedTarget instanceof Element
      ? event.relatedTarget.closest(LINK_SELECTOR)
      : null;

    if (nextLink === link) return;
    hideTooltip(link);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideTooltip();
    }
  });

  window.addEventListener("scroll", () => {
    hideTooltip();
  }, true);

  window.addEventListener("resize", () => {
    if (activeLink) {
      positionTooltip(activeLink);
    }
  });
})();
