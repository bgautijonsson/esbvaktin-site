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

  return {
    debounce: debounce,
    escapeHtml: escapeHtml,
    formatIsDate: formatIsDate,
    formatNumber: formatNumber,
    getDataBase: getDataBase,
  };
});
