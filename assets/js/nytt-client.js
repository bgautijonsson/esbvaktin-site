/**
 * /nytt — Debate Delta client-side logic
 *
 * Handles:
 * - localStorage last_visit tracking
 * - Updating anchor slab "since last visit" text
 * - Hiding items older than last visit (with "show all" fallback)
 * - Empty/caught-up states
 */
(function () {
  "use strict";

  var STORAGE_KEY = "esbvaktin_last_visit";
  var STALE_DAYS = 60;
  var DEFAULT_DAYS = 7;

  var MONTHS = [
    "janúar", "febrúar", "mars", "apríl", "maí", "júní",
    "júlí", "ágúst", "september", "október", "nóvember", "desember",
  ];

  function formatIsDate(dateStr) {
    var m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return dateStr;
    return Number(m[3]) + ". " + MONTHS[Number(m[2]) - 1] + " " + m[1];
  }

  function daysBetween(d1, d2) {
    return Math.floor((d2 - d1) / 86400000);
  }

  function getLastVisit() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      var date = new Date(stored);
      if (isNaN(date.getTime())) return null;
      // Stale check: if last visit was 60+ days ago, treat as first visit
      if (daysBetween(date, new Date()) >= STALE_DAYS) return null;
      return date;
    } catch (e) {
      return null;
    }
  }

  function setLastVisit() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch (e) {
      // Privacy mode — silently fail
    }
  }

  function init() {
    var lastVisit = getLastVisit();
    var sinceEl = document.getElementById("nytt-since");
    var timelineEl = document.getElementById("nytt-timeline");
    var emptyEl = document.getElementById("nytt-empty");
    var caughtUpEl = document.getElementById("nytt-caught-up");

    if (!timelineEl) return;

    var cutoffDate;

    if (lastVisit) {
      // Show "since last visit" text
      var visitDateStr = lastVisit.toISOString().slice(0, 10);
      if (sinceEl) {
        sinceEl.textContent = "Síðan þú komst síðast: " + formatIsDate(visitDateStr);
      }
      cutoffDate = visitDateStr;
    } else {
      // First visit or stale — show last 7 days
      var d = new Date();
      d.setDate(d.getDate() - DEFAULT_DAYS);
      cutoffDate = d.toISOString().slice(0, 10);
    }

    // Count visible items after cutoff and update anchor counts
    var dateGroups = timelineEl.querySelectorAll(".nytt-date-group");
    var visibleItems = 0;
    var countsByType = { greining: 0, fullyrding: 0, brennidepill: 0, endurvakin: 0 };

    dateGroups.forEach(function (group) {
      var groupDate = group.getAttribute("data-date");
      if (groupDate < cutoffDate) {
        group.style.opacity = "0.4";
      } else {
        var items = group.querySelectorAll(".nytt-item");
        items.forEach(function (item) {
          visibleItems++;
          if (item.classList.contains("nytt-item--greining")) countsByType.greining++;
          if (item.classList.contains("nytt-item--fullyrding")) countsByType.fullyrding++;
          if (item.classList.contains("nytt-item--brennidepill")) countsByType.brennidepill++;
          if (item.classList.contains("nytt-item--endurvakin")) countsByType.endurvakin++;
        });
      }
    });

    // Update anchor slab counts to reflect "since last visit" window
    if (lastVisit) {
      var countsEl = document.getElementById("nytt-counts");
      if (countsEl) {
        var parts = [];
        if (countsByType.greining) {
          parts.push("<span class=\"nytt-anchor-stat\"><strong>" + countsByType.greining + "</strong> " +
            (countsByType.greining === 1 ? "ný greining" : "nýjar greiningar") + "</span>");
        }
        if (countsByType.fullyrding) {
          parts.push("<span class=\"nytt-anchor-stat\"><strong>" + countsByType.fullyrding + "</strong> " +
            (countsByType.fullyrding === 1 ? "ný fullyrðing" : "nýjar fullyrðingar") + "</span>");
        }
        if (countsByType.brennidepill) {
          parts.push("<span class=\"nytt-anchor-stat\"><strong>" + countsByType.brennidepill + "</strong> " +
            (countsByType.brennidepill === 1 ? "málefni" : "málefni") + " í brennidepli</span>");
        }
        if (countsByType.endurvakin) {
          parts.push("<span class=\"nytt-anchor-stat\"><strong>" + countsByType.endurvakin + "</strong> " +
            (countsByType.endurvakin === 1 ? "endurvakin fullyrðing" : "endurvaknar fullyrðingar") + "</span>");
        }
        if (parts.length > 0) {
          countsEl.innerHTML = parts.join("");
        }
      }
    }

    // Show empty or caught-up states
    if (visibleItems === 0 && !lastVisit) {
      // Nothing new in default window
      if (emptyEl) emptyEl.hidden = false;
    } else if (visibleItems === 0 && lastVisit) {
      // Returning user, all caught up
      if (caughtUpEl) caughtUpEl.hidden = false;
    }

    // Record this visit
    setLastVisit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
