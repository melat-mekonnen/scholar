const SECTION_HEADERS = [
  "Overview",
  "Eligibility",
  "Funding",
  "Important dates",
  "How to apply",
  "Official links",
];

function section(title, body) {
  const text = String(body || "").trim();
  if (!text) return "";
  return `## ${title}\n\n${text}`;
}

function formatDates(facts) {
  const parts = [];
  if (facts.applicationStartDate) parts.push(`Application opens: ${facts.applicationStartDate}`);
  if (facts.applicationEndDate) parts.push(`Application closes: ${facts.applicationEndDate}`);
  if (facts.deadline) parts.push(`Deadline: ${facts.deadline}`);
  if (facts.isRolling || facts.applicationStatus === "rolling") {
    parts.push("Rolling intake — check the official page for current deadlines.");
  }
  if (facts.applicationStatus === "closed") {
    parts.push("Applications for the current cycle are closed.");
  }
  return parts.join("\n");
}

function formatFunding(facts) {
  const parts = [];
  if (facts.fundingType) {
    parts.push(`Funding type: ${String(facts.fundingType).replace(/_/g, " ")}.`);
  }
  if (facts.amount) parts.push(facts.amount);
  return parts.join("\n");
}

function formatEligibility(facts) {
  const parts = [];
  if (facts.degreeLevel) {
    parts.push(`Degree level: ${String(facts.degreeLevel).replace(/_/g, " ")}.`);
  }
  if (facts.fieldOfStudy) parts.push(`Field of study: ${facts.fieldOfStudy}.`);
  if (facts.eligibleRegions?.length) {
    parts.push(`Eligible regions: ${facts.eligibleRegions.join(", ")}.`);
  }
  if (facts.country) parts.push(`Host / destination: ${facts.hostCountry || facts.country}.`);
  return parts.join("\n");
}

function formatHowToApply(facts) {
  const parts = [];
  if (facts.applicationUrl) {
    parts.push(`Apply via the official page: ${facts.applicationUrl}`);
  }
  if (facts.applicationStatus === "closed") {
    parts.push("Check the official site for the next application cycle.");
  }
  return parts.join("\n");
}

function formatOfficialLinks(facts) {
  const links = facts.officialLinks || [];
  if (!links.length && facts.sourceUrl) links.push(facts.sourceUrl);
  return links.map((u) => `- ${u}`).join("\n");
}

/**
 * Build sectioned markdown description from extracted facts (no AI).
 */
function formatDescriptionFromFacts(facts) {
  const overview =
    facts.rawExcerpt ||
    `${facts.title || "This programme"} is offered by ${facts.organization || "the funding body"}.`;

  const sections = [
    section("Overview", overview.slice(0, 900)),
    section("Eligibility", formatEligibility(facts)),
    section("Funding", formatFunding(facts)),
    section("Important dates", formatDates(facts)),
    section("How to apply", formatHowToApply(facts)),
    section("Official links", formatOfficialLinks(facts)),
  ].filter(Boolean);

  return sections.join("\n\n").trim();
}

function parseDescriptionSections(description) {
  const text = String(description || "").trim();
  if (!text) return [];

  const parts = text.split(/^##\s+/m).filter(Boolean);
  if (parts.length <= 1 && !text.startsWith("##")) {
    return [{ heading: "About", body: text }];
  }

  return parts.map((block) => {
    const nl = block.indexOf("\n");
    const heading = nl >= 0 ? block.slice(0, nl).trim() : block.trim();
    const body = nl >= 0 ? block.slice(nl + 1).trim() : "";
    return { heading, body };
  });
}

module.exports = {
  SECTION_HEADERS,
  formatDescriptionFromFacts,
  parseDescriptionSections,
};
