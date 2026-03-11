(function (root, factory) {
  var utils = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = utils;
  }

  root.ESBvaktinTrackerUtils = utils;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var MONTHS = [
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

  function getDataBase(currentScript, defaultBase) {
    if (currentScript && currentScript.dataset && currentScript.dataset.base) {
      return currentScript.dataset.base;
    }

    var scriptWithBase = document.querySelector("script[data-base]");
    return scriptWithBase ? scriptWithBase.getAttribute("data-base") : (defaultBase || "/assets/data");
  }

  function escapeHtml(value) {
    if (value == null) return "";

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatIsDate(value) {
    if (!value) return "";

    var match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return Number(match[3]) + ". " + (MONTHS[Number(match[2]) - 1] || "") + " " + match[1];
    }

    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.getUTCDate() + ". " + MONTHS[date.getUTCMonth()] + " " + date.getUTCFullYear();
  }

  function formatNumber(value) {
    if (value == null) return "0";
    return Number(value).toLocaleString("is-IS");
  }

  function normalizeReportSummary(value) {
    if (value == null) return "";

    return String(value)
      .replace(/\s+([.,;:!?])/g, "$1")
      .replace(/\bFramsetnng\b/g, "Framsetning")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function normalizeLookupText(value) {
    if (value == null) return "";

    var normalized = String(value)
      .toLowerCase()
      .replace(/ð/g, "d")
      .replace(/þ/g, "th")
      .replace(/æ/g, "ae");

    if (typeof normalized.normalize === "function") {
      normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    return normalized.replace(/[^a-z0-9]+/g, " ").trim();
  }

  function normalizeLookupDate(value) {
    if (value == null) return "";

    var stringValue = String(value).trim();
    var match = stringValue.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : stringValue;
  }

  function getTitleDateLookupKey(title, date) {
    var normalizedTitle = normalizeLookupText(title);
    var normalizedDate = normalizeLookupDate(date);

    if (!normalizedTitle || !normalizedDate) {
      return "";
    }

    return normalizedTitle + "|" + normalizedDate;
  }

  function normalizeExternalUrl(value) {
    if (value == null) return "";

    var stringValue = String(value).trim();
    if (!stringValue || !/^https?:\/\//i.test(stringValue)) {
      return "";
    }

    try {
      var url = new URL(stringValue);
      url.hash = "";
      if (url.pathname.length > 1) {
        url.pathname = url.pathname.replace(/\/+$/, "");
      }
      return url.toString();
    } catch (_error) {
      return stringValue.replace(/\/+$/, "");
    }
  }

  function createReportLookup(reports) {
    var byArticleUrl = new Map();
    var byTitleDate = new Map();

    (reports || []).forEach(function (report) {
      if (!report) return;

      var articleUrl = normalizeExternalUrl(report.article_url);
      if (articleUrl && !byArticleUrl.has(articleUrl)) {
        byArticleUrl.set(articleUrl, report);
      }

      var key = getTitleDateLookupKey(report.article_title, report.article_date);
      if (!key) return;

      if (!byTitleDate.has(key)) {
        byTitleDate.set(key, report);
        return;
      }

      var existing = byTitleDate.get(key);
      if (existing && existing.slug !== report.slug) {
        byTitleDate.set(key, null);
      }
    });

    return {
      byArticleUrl: byArticleUrl,
      byTitleDate: byTitleDate,
    };
  }

  function findReportForSource(source, reportLookup) {
    if (!source || !reportLookup) return null;

    var articleUrl = normalizeExternalUrl(source.source_url);
    if (articleUrl && reportLookup.byArticleUrl && reportLookup.byArticleUrl.has(articleUrl)) {
      return reportLookup.byArticleUrl.get(articleUrl) || null;
    }

    var key = getTitleDateLookupKey(source.source_title, source.source_date);
    if (!key || !reportLookup.byTitleDate || !reportLookup.byTitleDate.has(key)) {
      return null;
    }

    return reportLookup.byTitleDate.get(key) || null;
  }

  function createNewsSourceLookup(claims) {
    var byTitleDate = new Map();

    (claims || []).forEach(function (claim) {
      (claim && claim.sightings ? claim.sightings : []).forEach(function (sighting) {
        if (!sighting || sighting.source_type !== "news") return;

        var key = getTitleDateLookupKey(sighting.source_title, sighting.source_date);
        var normalizedUrl = normalizeExternalUrl(sighting.source_url);
        if (!key || !normalizedUrl) return;

        if (!byTitleDate.has(key)) {
          byTitleDate.set(key, {
            normalizedUrl: normalizedUrl,
            sourceUrl: sighting.source_url,
          });
          return;
        }

        var existing = byTitleDate.get(key);
        if (existing && existing.normalizedUrl !== normalizedUrl) {
          byTitleDate.set(key, null);
        }
      });
    });

    return {
      byTitleDate: byTitleDate,
    };
  }

  function findSourceUrlForReport(report, sourceLookup) {
    if (!report) return "";
    if (report.article_url) return report.article_url;
    if (!sourceLookup || !sourceLookup.byTitleDate) return "";

    var key = getTitleDateLookupKey(report.article_title, report.article_date);
    if (!key || !sourceLookup.byTitleDate.has(key)) {
      return "";
    }

    var match = sourceLookup.byTitleDate.get(key);
    return match ? match.sourceUrl : "";
  }

  function enrichReportRecord(report, sourceLookup) {
    if (!report) return report;

    return Object.assign({}, report, {
      article_url: report.article_url || findSourceUrlForReport(report, sourceLookup) || null,
      summary: normalizeReportSummary(report.summary),
    });
  }

  function debounce(fn, delay) {
    var timeoutId = null;

    return function () {
      var args = arguments;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(function () {
        fn.apply(null, args);
      }, delay);
    };
  }

  function updateUrlQuery(params) {
    if (
      typeof window === "undefined" ||
      typeof window.URL !== "function" ||
      !window.history ||
      typeof window.history.replaceState !== "function"
    ) {
      return "";
    }

    var url = new URL(window.location.href);

    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value == null || value === "" || value === false) {
        url.searchParams.delete(key);
        return;
      }

      url.searchParams.set(key, value);
    });

    var query = url.searchParams.toString();
    var nextUrl = url.pathname + (query ? "?" + query : "") + url.hash;
    window.history.replaceState({}, "", nextUrl);
    return nextUrl;
  }

  function sanitizeInternalUrl(value) {
    if (value == null) return "";

    var stringValue = String(value).trim();
    if (!stringValue) return "";

    if (
      typeof window === "undefined" ||
      typeof window.URL !== "function" ||
      !window.location ||
      !window.location.origin
    ) {
      return stringValue.charAt(0) === "/" && stringValue.charAt(1) !== "/" ? stringValue : "";
    }

    try {
      var url = new URL(stringValue, window.location.origin);
      if (url.origin !== window.location.origin || url.pathname.charAt(0) !== "/") {
        return "";
      }

      return url.pathname + url.search + url.hash;
    } catch (_error) {
      return "";
    }
  }

  function getCurrentPathWithQuery() {
    if (typeof window === "undefined" || !window.location) return "";
    return sanitizeInternalUrl(window.location.pathname + window.location.search + window.location.hash);
  }

  function buildReturnUrl(targetId) {
    var currentUrl = getCurrentPathWithQuery();
    if (!currentUrl) return "";

    var hashlessUrl = currentUrl.replace(/#.*$/, "");
    var normalizedTargetId = targetId == null ? "" : String(targetId).replace(/^#/, "").trim();
    if (!normalizedTargetId) {
      return sanitizeInternalUrl(hashlessUrl);
    }

    return sanitizeInternalUrl(hashlessUrl + "#" + normalizedTargetId);
  }

  function withReturnUrl(url, returnUrl) {
    var safeUrl = sanitizeInternalUrl(url);
    var safeReturnUrl = sanitizeInternalUrl(returnUrl || getCurrentPathWithQuery());

    if (!safeUrl || !safeReturnUrl) {
      return safeUrl || String(url || "");
    }

    if (
      typeof window === "undefined" ||
      typeof window.URL !== "function" ||
      !window.location ||
      !window.location.origin
    ) {
      return safeUrl;
    }

    var target = new URL(safeUrl, window.location.origin);
    target.searchParams.set("return", safeReturnUrl);
    return target.pathname + target.search + target.hash;
  }

  function getReturnUrl(fallbackUrl) {
    if (
      typeof window === "undefined" ||
      typeof window.URLSearchParams !== "function" ||
      !window.location
    ) {
      return sanitizeInternalUrl(fallbackUrl);
    }

    var params = new URLSearchParams(window.location.search);
    return sanitizeInternalUrl(params.get("return")) || sanitizeInternalUrl(fallbackUrl);
  }

  function bindReturnLinks(root) {
    if (typeof document === "undefined") return;

    var scope = root && typeof root.querySelectorAll === "function" ? root : document;
    var inheritedReturnUrl = getReturnUrl("");

    Array.prototype.forEach.call(scope.querySelectorAll("[data-return-link]"), function (link) {
      var fallbackUrl = link.getAttribute("data-return-fallback") || link.getAttribute("href") || "/";
      var targetUrl = inheritedReturnUrl || sanitizeInternalUrl(fallbackUrl);
      var returnLabel = link.getAttribute("data-return-label");

      if (targetUrl) {
        link.setAttribute("href", targetUrl);
      }

      if (inheritedReturnUrl && returnLabel) {
        link.textContent = returnLabel;
      }
    });

    if (!inheritedReturnUrl) return;

    Array.prototype.forEach.call(scope.querySelectorAll("[data-preserve-return]"), function (link) {
      var href = link.getAttribute("href");
      if (!href) return;

      var targetUrl = withReturnUrl(href, inheritedReturnUrl);
      if (targetUrl) {
        link.setAttribute("href", targetUrl);
      }
    });
  }

  function restoreReturnTarget(root) {
    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      !window.location ||
      !window.location.hash
    ) {
      return false;
    }

    var targetId = decodeURIComponent(window.location.hash.slice(1));
    if (!targetId) return false;

    var target = document.getElementById(targetId);
    if (!target) return false;

    if (root && typeof root.contains === "function" && !root.contains(target)) {
      return false;
    }

    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
      target.setAttribute("data-return-tabindex", "true");
    }

    if (typeof target.focus === "function") {
      try {
        target.focus({ preventScroll: true });
      } catch (_error) {
        target.focus();
      }
    }

    if (typeof target.scrollIntoView === "function") {
      var prefersReducedMotion = typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }

    target.classList.add("tracker-return-target");
    window.setTimeout(function () {
      target.classList.remove("tracker-return-target");
      if (target.getAttribute("data-return-tabindex") === "true") {
        target.removeAttribute("tabindex");
        target.removeAttribute("data-return-tabindex");
      }
    }, 1800);

    if (window.history && typeof window.history.replaceState === "function") {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }

    return true;
  }

  return {
    bindReturnLinks: bindReturnLinks,
    buildReturnUrl: buildReturnUrl,
    debounce: debounce,
    escapeHtml: escapeHtml,
    formatIsDate: formatIsDate,
    formatNumber: formatNumber,
    findReportForSource: findReportForSource,
    findSourceUrlForReport: findSourceUrlForReport,
    getCurrentPathWithQuery: getCurrentPathWithQuery,
    getDataBase: getDataBase,
    getReturnUrl: getReturnUrl,
    getTitleDateLookupKey: getTitleDateLookupKey,
    createNewsSourceLookup: createNewsSourceLookup,
    createReportLookup: createReportLookup,
    enrichReportRecord: enrichReportRecord,
    normalizeReportSummary: normalizeReportSummary,
    normalizeExternalUrl: normalizeExternalUrl,
    normalizeLookupText: normalizeLookupText,
    restoreReturnTarget: restoreReturnTarget,
    sanitizeInternalUrl: sanitizeInternalUrl,
    updateUrlQuery: updateUrlQuery,
    withReturnUrl: withReturnUrl,
  };
});
