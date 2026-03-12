#!/usr/bin/env node
/**
 * GoatCounter stats CLI for esbvaktin.is
 *
 * Usage:
 *   npm run stats                  # Today's summary
 *   npm run stats -- --week        # Last 7 days
 *   npm run stats -- --month       # Last 30 days
 *   npm run stats -- --events      # Custom events only
 *   npm run stats -- --pages       # Top pages only
 *   npm run stats -- --referrers   # Top referrers only
 *   npm run stats -- --all         # Everything
 *
 * Requires GOATCOUNTER_TOKEN in .env (create at esbvaktin.goatcounter.com/settings/api)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────
const SITE = 'esbvaktin';
const BASE = `https://${SITE}.goatcounter.com/api/v0`;

// ── Load token from .env ────────────────────────────────────────
function loadToken() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Missing .env file. Create one with:');
    console.error('  echo "GOATCOUNTER_TOKEN=your-token-here" > .env');
    console.error('  Get a token at: https://esbvaktin.goatcounter.com/settings/api');
    process.exit(1);
  }
  const env = fs.readFileSync(envPath, 'utf8');
  const match = env.match(/GOATCOUNTER_TOKEN=(.+)/);
  if (!match) {
    console.error('.env file must contain GOATCOUNTER_TOKEN=...');
    process.exit(1);
  }
  return match[1].trim();
}

// ── HTTP helper ─────────────────────────────────────────────────
function get(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
    https.get(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API ${res.statusCode}: ${body}`));
          return;
        }
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`Bad JSON: ${body.slice(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

// ── Date helpers ────────────────────────────────────────────────
function roundHour(d) {
  d.setMinutes(0, 0, 0);
  return d;
}

function formatDate(d) {
  return d.toISOString().replace(/T.*/, '');
}

function getRange(period) {
  const end = roundHour(new Date());
  const start = roundHour(new Date());
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setDate(start.getDate() - 30);
      break;
  }
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: period === 'today' ? 'Today' : period === 'week' ? 'Last 7 days' : 'Last 30 days',
  };
}

// ── Display helpers ─────────────────────────────────────────────
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';

function heading(text) {
  console.log(`\n${BOLD}${CYAN}── ${text} ${'─'.repeat(Math.max(0, 50 - text.length))}${RESET}`);
}

function row(label, count, maxCount) {
  const barLen = maxCount > 0 ? Math.round((count / maxCount) * 30) : 0;
  const bar = '█'.repeat(barLen);
  const pad = ' '.repeat(Math.max(0, 35 - label.length));
  console.log(`  ${label}${pad}${GREEN}${String(count).padStart(6)}${RESET}  ${DIM}${bar}${RESET}`);
}

// ── API calls ───────────────────────────────────────────────────
async function fetchHits(range, limit = 20) {
  const url = `${BASE}/stats/hits?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}&limit=${limit}`;
  return get(url);
}

async function fetchTotal(range) {
  const url = `${BASE}/stats/total?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`;
  return get(url);
}

// ── Report sections ─────────────────────────────────────────────
async function showSummary(range) {
  const total = await fetchTotal(range);
  heading(`${range.label} — Summary`);
  console.log(`  ${BOLD}Total pageviews:${RESET}  ${GREEN}${total.total?.toLocaleString() ?? 'N/A'}${RESET}`);
  if (total.total_unique != null) {
    console.log(`  ${BOLD}Unique visitors:${RESET}  ${GREEN}${total.total_unique.toLocaleString()}${RESET}`);
  }
}

async function showPages(range) {
  const data = await fetchHits(range, 20);
  const paths = (data.paths || [])
    .filter(p => !p.path.startsWith('scroll/') && !p.path.startsWith('outbound/')
      && !p.path.startsWith('nav/') && !p.path.startsWith('filter/')
      && !p.path.startsWith('detail/') && p.path !== 'support-click')
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 15);

  if (!paths.length) {
    heading('Top Pages');
    console.log(`  ${DIM}No page data yet${RESET}`);
    return;
  }

  const maxCount = paths[0].count || 1;
  heading('Top Pages');
  for (const p of paths) {
    row(p.path, p.count || 0, maxCount);
  }
}

async function showEvents(range) {
  const data = await fetchHits(range, 100);
  const events = (data.paths || [])
    .filter(p => p.event)
    .sort((a, b) => (b.count || 0) - (a.count || 0));

  if (!events.length) {
    heading('Custom Events');
    console.log(`  ${DIM}No events yet${RESET}`);
    return;
  }

  // Group by category
  const groups = {};
  for (const e of events) {
    const cat = e.path.split('/')[0] || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(e);
  }

  heading('Custom Events');
  for (const [cat, items] of Object.entries(groups)) {
    const catLabel = {
      outbound: 'Outbound Links',
      nav: 'Navigation',
      filter: 'Tracker Filters',
      detail: 'Detail Click-through',
      scroll: 'Scroll Depth',
      'support-click': 'Support Button',
    }[cat] || cat;

    console.log(`\n  ${BOLD}${YELLOW}${catLabel}${RESET}`);
    const maxCount = items[0]?.count || 1;
    for (const e of items.slice(0, 10)) {
      const label = e.path.includes('/') ? e.path.split('/').slice(1).join('/') : e.path;
      row(label, e.count || 0, maxCount);
    }
  }
}

async function showReferrers(range) {
  // Get top pages, then fetch referrers for the top ones
  const data = await fetchHits(range, 5);
  const paths = (data.paths || [])
    .filter(p => !p.event)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 5);

  heading('Top Referrers (by page)');

  if (!paths.length) {
    console.log(`  ${DIM}No data yet${RESET}`);
    return;
  }

  for (const p of paths) {
    try {
      const refData = await get(`${BASE}/stats/hits/${p.id}?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`);
      const refs = (refData.refs || [])
        .filter(r => r.name)
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 5);

      if (refs.length) {
        console.log(`\n  ${BOLD}${p.path}${RESET}`);
        const maxRef = refs[0].count || 1;
        for (const r of refs) {
          row(r.name, r.count || 0, maxRef);
        }
      }
    } catch (_) {
      // Skip if referrer fetch fails
    }
  }
}

// ── Main ────────────────────────────────────────────────────────
const TOKEN = loadToken();

async function main() {
  const args = process.argv.slice(2);
  const period = args.includes('--month') ? 'month'
    : args.includes('--week') ? 'week'
    : 'today';

  const showAll = args.includes('--all');
  const onlyEvents = args.includes('--events');
  const onlyPages = args.includes('--pages');
  const onlyRefs = args.includes('--referrers');
  const showDefault = !showAll && !onlyEvents && !onlyPages && !onlyRefs;

  const range = getRange(period);
  console.log(`${DIM}esbvaktin.goatcounter.com — ${range.label} (${formatDate(new Date(range.start))} → ${formatDate(new Date(range.end))})${RESET}`);

  try {
    if (showDefault || showAll) {
      await showSummary(range);
    }
    if (showDefault || showAll || onlyPages) {
      await showPages(range);
    }
    if (showDefault || showAll || onlyEvents) {
      await showEvents(range);
    }
    if (showAll || onlyRefs) {
      await showReferrers(range);
    }
  } catch (err) {
    console.error(`\n${BOLD}Error:${RESET} ${err.message}`);
    if (err.message.includes('401') || err.message.includes('403')) {
      console.error('Check your GOATCOUNTER_TOKEN in .env');
    }
    process.exit(1);
  }

  console.log('');
}

main();
