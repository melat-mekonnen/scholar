const { chatCompletion } = require("./openRouterClient");
const { formatDescriptionFromFacts } = require("./formatDescriptionSections");
const { env } = require("../../../config/env");

const REFINE_SYSTEM = `You organize scholarship programme information for students.
Use ONLY facts provided in the JSON — do not invent eligibility, amounts, or dates.
Output markdown with these exact section headings:
## Overview
## Eligibility
## Funding
## Important dates
## How to apply
## Official links
Keep each section concise (2–5 sentences or bullet list). Use bullet lists where helpful.`;

function validateRefinedAgainstFacts(refined, facts) {
  const text = String(refined || "").toLowerCase();
  const requiredHeadings = ["overview", "eligibility", "how to apply"];
  for (const h of requiredHeadings) {
    if (!text.includes(`## ${h}`)) return false;
  }
  if (facts.applicationUrl && !text.includes(new URL(facts.applicationUrl).hostname.replace(/^www\./, ""))) {
    // allow if any official link host appears
    const hosts = (facts.officialLinks || [])
      .concat(facts.applicationUrl, facts.sourceUrl)
      .filter(Boolean)
      .map((u) => {
        try {
          return new URL(u).hostname.replace(/^www\./, "");
        } catch {
          return "";
        }
      })
      .filter(Boolean);
    if (!hosts.some((h) => text.includes(h))) return false;
  }
  return text.length >= 200;
}

async function refineScholarshipDescription(facts, { fallback = true } = {}) {
  if (!env.aiDescriptionRefineEnabled || !env.openRouterApiKey) {
    return {
      description: formatDescriptionFromFacts(facts),
      source: "template",
      validated: true,
    };
  }

  try {
    const user = `Facts JSON:\n${JSON.stringify(facts, null, 2)}`;
    const refined = await chatCompletion({ system: REFINE_SYSTEM, user });
    const validated = validateRefinedAgainstFacts(refined, facts);
    if (validated) {
      return { description: refined, source: "openrouter", validated: true };
    }
    if (fallback) {
      return {
        description: formatDescriptionFromFacts(facts),
        source: "template_fallback",
        validated: false,
      };
    }
    return { description: refined, source: "openrouter", validated: false };
  } catch (err) {
    if (fallback) {
      return {
        description: formatDescriptionFromFacts(facts),
        source: "template_error",
        validated: true,
        error: err.message,
      };
    }
    throw err;
  }
}

module.exports = {
  refineScholarshipDescription,
  validateRefinedAgainstFacts,
};
