/**
 * site-analytics.js — GoatCounter event tracking for esbvaktin.is
 *
 * Tracks: outbound links, support button, scroll depth, nav clicks.
 * Tracker-specific events (filter usage, detail clicks) fire from
 * tracker-controller.js via ESBvaktinAnalytics.track().
 */
(function () {
  'use strict';

  // GoatCounter must be loaded first (async script in base.njk)
  function gc(path, title) {
    if (typeof window.goatcounter === 'undefined' || !window.goatcounter.count) return;
    window.goatcounter.count({ path: path, title: title, event: true });
  }

  // ── Public API ────────────────────────────────────────────────
  var Analytics = {
    track: function (name, detail) {
      var path = detail ? name + '/' + detail : name;
      gc(path, name);
    }
  };

  // ── Outbound links ────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="http"]');
    if (!link) return;

    // Skip internal links
    try {
      if (new URL(link.href).hostname === location.hostname) return;
    } catch (_) { return; }

    var host = new URL(link.href).hostname.replace(/^www\./, '');
    gc('outbound/' + host, 'Outbound: ' + host);
  });

  // ── Support / donate button ───────────────────────────────────
  document.addEventListener('click', function (e) {
    if (e.target.closest('.nav-support-btn') || e.target.closest('#bmc-wbtn')) {
      gc('support-click', 'Support button');
    }
  });

  // ── Nav clicks ────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var navLink = e.target.closest('.site-nav a:not(.site-logo)');
    if (!navLink) return;

    var href = navLink.getAttribute('href') || '';
    gc('nav/' + href.replace(/^\/|\/$/g, ''), 'Nav: ' + (navLink.textContent || '').trim());
  });

  // ── Scroll depth (50% and 90%) ────────────────────────────────
  var scrollFired = {};
  function checkScroll() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    var pct = Math.round((scrollTop / docHeight) * 100);
    if (pct >= 90 && !scrollFired['90']) {
      scrollFired['90'] = true;
      gc('scroll/90', 'Scroll 90%');
    } else if (pct >= 50 && !scrollFired['50']) {
      scrollFired['50'] = true;
      gc('scroll/50', 'Scroll 50%');
    }
  }

  // Throttled scroll listener
  var scrollTimer;
  window.addEventListener('scroll', function () {
    if (scrollTimer) return;
    scrollTimer = setTimeout(function () {
      scrollTimer = null;
      checkScroll();
    }, 300);
  }, { passive: true });

  // ── Detail click-through (tracker card links) ─────────────────
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[class*="-card-link"], [class*="-see-more"]');
    if (!link) return;

    var href = link.getAttribute('href') || '';
    var section = href.split('/').filter(Boolean)[0] || 'unknown';
    gc('detail/' + section, 'Detail: ' + section);
  });

  // ── Expose globally ───────────────────────────────────────────
  window.ESBvaktinAnalytics = Analytics;
})();
