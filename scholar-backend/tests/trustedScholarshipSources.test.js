const test = require("node:test");
const assert = require("node:assert/strict");
const {
  extractAnchors,
  filterScholarshipLike,
  extractDeadlineIso,
  extractMetaDescription,
} = require("../src/services/trustedScholarshipSources");

test("extractAnchors parses link text and href", () => {
  const html = `
    <html><body>
      <a href="/aid/scholarship-a">Scholarship A</a>
      <a href="https://example.org/fellowships">Fellowship List</a>
    </body></html>
  `;
  const out = extractAnchors(html);
  assert.equal(out.length, 2);
  assert.equal(out[0].href, "/aid/scholarship-a");
  assert.equal(out[0].text, "Scholarship A");
});

test("filterScholarshipLike keeps scholarship-related anchors", () => {
  const input = [
    { href: "/about", text: "About Us" },
    { href: "/financial-aid", text: "Financial Aid and Scholarships" },
    { href: "/fellowships", text: "Graduate Fellowship opportunities" },
  ];
  const out = filterScholarshipLike(input);
  assert.equal(out.length, 2);
});

test("extractDeadlineIso parses long month date", () => {
  const text = "Application deadline: May 31, 2026.";
  assert.equal(extractDeadlineIso(text), "2026-05-31");
});

test("extractMetaDescription reads description tag", () => {
  const html = '<meta name="description" content="Funding for undergraduate applicants">';
  assert.equal(extractMetaDescription(html), "Funding for undergraduate applicants");
});
