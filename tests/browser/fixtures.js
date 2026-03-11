const base = require("@playwright/test");

const IGNORED_REQUEST_FAILURES = [
  "favicon.ico",
];

const test = base.test.extend({
  clientIssues: async ({ page }, use, testInfo) => {
    const issues = {
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
    };

    page.on("console", (message) => {
      if (message.type() === "error") {
        issues.consoleErrors.push(message.text());
      }
    });

    page.on("pageerror", (error) => {
      issues.pageErrors.push(error.message);
    });

    page.on("requestfailed", (request) => {
      const url = request.url();

      if (IGNORED_REQUEST_FAILURES.some((pattern) => url.includes(pattern))) return;

      issues.requestFailures.push({
        method: request.method(),
        url,
        failure: request.failure() ? request.failure().errorText : "unknown",
      });
    });

    await use(issues);

    const hasIssues =
      issues.consoleErrors.length > 0 ||
      issues.pageErrors.length > 0 ||
      issues.requestFailures.length > 0;

    if (hasIssues) {
      await testInfo.attach("client-issues", {
        body: JSON.stringify(issues, null, 2),
        contentType: "application/json",
      });
    }

    base.expect(issues.consoleErrors, "Console errors detected during browser review").toEqual([]);
    base.expect(issues.pageErrors, "Unhandled page errors detected during browser review").toEqual([]);
    base.expect(issues.requestFailures, "Failed requests detected during browser review").toEqual([]);
  },
});

module.exports = {
  test,
  expect: base.expect,
};
