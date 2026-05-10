const test = require("node:test");
const assert = require("node:assert/strict");
const { extractFromText } = require("../src/services/discoveryPipeline");

test("extractFromText returns structured scholarship fields from a documented page", () => {
  const html = `
    <html>
      <head>
        <title>Fully Funded Master Scholarships in Canada</title>
        <meta name="description" content="Apply now for a fully funded master scholarship open to international students in engineering and business." />
      </head>
      <body>
        <h1>Canada Graduate Scholarships</h1>
        <p>Deadline: October 31, 2026</p>
        <p>Eligibility: international students, STEM and business fields, minimum GPA 3.0, IELTS 6.5 required.</p>
        <p>Funding: fully funded with tuition and living stipend.</p>
      </body>
    </html>
  `;

  const extracted = extractFromText({ html, fallbackTitle: "" , pageUrl: "https://example.edu/scholarships/2026" });

  assert.equal(extracted.isScholarship, true);
  assert.equal(extracted.title, "Fully Funded Master Scholarships in Canada");
  assert.equal(extracted.country, "Canada");
  assert.equal(extracted.deadline, "2026-10-31");
  assert.equal(extracted.fundingType, "fully funded");
  assert.equal(extracted.gpaRequirements, "GPA 3.0");
  assert.equal(extracted.englishRequirements.toLowerCase().includes("ielts"), true);
  assert.ok(Array.isArray(extracted.eligibleFields));
  assert.ok(extracted.eligibleFields.length > 0);
});
