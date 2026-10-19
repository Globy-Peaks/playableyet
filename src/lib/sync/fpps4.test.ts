import assert from "node:assert/strict";
import test from "node:test";
import { fpps4SchemeLoop, mergeLabeledIssues, reportFromFpIssue } from "./fetchers";

const knowledge = {
  title: "Knowledge is Power - CUSA06044",
  html_url: "https://github.com/red-prig/fpps4-game-compatibility/issues/2230",
  updated_at: "2025-05-12T16:45:03Z",
  labels: [{ name: "status-nothing" }, { name: "behaviour-stuck" }],
  body: `### Game Name

Knowledge is Power

### Game code

CUSA06044

### Current status

Nothing
`,
};

test("an http and https redirect of the same fpPS4 path is a loop", () => {
  assert.equal(
    fpps4SchemeLoop("https://api.fpps4.net/database.json", "http://api.fpps4.net/database.json"),
    true,
  );
  assert.equal(
    fpps4SchemeLoop("http://api.fpps4.net/database.json", "https://api.fpps4.net/database.json"),
    true,
  );
  assert.equal(
    fpps4SchemeLoop("https://api.fpps4.net/database.json", "https://example.com/database.json"),
    false,
  );
});

test("fpPS4 issues keep the label, title id, and issue link", () => {
  const report = reportFromFpIssue(knowledge);
  assert.ok(report);
  assert.equal(report.titleId, "CUSA06044");
  assert.equal(report.status, "nothing");
  assert.equal(report.name, "Knowledge is Power");
  assert.equal(report.updatedAt, "2025-05-12");
  assert.equal(report.sourceUrl, knowledge.html_url);
});

test("system-firmware fpPS4 issues are skipped", () => {
  const report = reportFromFpIssue({
    ...knowledge,
    labels: [{ name: "status-nothing" }, { name: "app-system-fw505" }],
  });
  assert.equal(report, null);
});

test("two full GitHub windows without overlap are incomplete", () => {
  const older = Array.from({ length: 1000 }, (_, index) => ({ html_url: `https://example.com/${index}` }));
  const newer = Array.from({ length: 1000 }, (_, index) => ({ html_url: `https://example.com/${index + 1000}` }));
  const overlapping = Array.from({ length: 1000 }, (_, index) => ({
    html_url: `https://example.com/${index + 400}`,
  }));
  assert.equal(mergeLabeledIssues(older, newer).complete, false);
  assert.equal(mergeLabeledIssues(older, overlapping).complete, true);
  assert.equal(mergeLabeledIssues(older, overlapping).issues.length, 1400);
});
