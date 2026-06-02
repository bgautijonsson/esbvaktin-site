"use strict";

// JS side of the slug parity contract (xrepo-05). Asserts the site's isSlug() produces
// the same slugs as the backend's Python icelandic_slugify() for a shared fixture.
// The identical fixture is asserted by tests/test_slug_parity.py in the esbvaktin repo,
// so a divergence between the Python join-key generator and this JS mirror fails here.
// Run: pnpm run test:unit   (built-in node:test, no extra dependency)

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { isSlug } = require("../lib/slug.js");

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "slug_parity.json"), "utf8"),
);

test("isSlug matches the Python parity fixture", () => {
  assert.ok(fixture.length > 0, "fixture must not be empty");
  for (const { input, slug } of fixture) {
    assert.strictEqual(isSlug(input), slug, `slug drift for input: ${input}`);
  }
});
