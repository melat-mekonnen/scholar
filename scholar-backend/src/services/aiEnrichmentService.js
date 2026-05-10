const { OpenAI } = require("openai");
const { env } = require("../config/env");

const openai = env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : null;

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim());
  return String(value)
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fallbackEnrichment({ title, description, fundingType, eligibleCountries, eligibleFields }) {
  const tags = new Set();
  if (title) title.split(/[^A-Za-z0-9]+/).forEach((token) => token.length > 2 && tags.add(token.toLowerCase()));
  if (fundingType) tags.add(fundingType.toLowerCase());
  if (eligibleFields) normalizeList(eligibleFields).forEach((field) => tags.add(field.toLowerCase()));
  if (eligibleCountries) normalizeList(eligibleCountries).forEach((country) => tags.add(country.toLowerCase()));
  return {
    normalizedTags: Array.from(tags).slice(0, 20),
    fundingClassification: fundingType || "financial support",
    eligibilityHints: normalizeText(
      [eligibleCountries, eligibleFields, description]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 500),
    ),
  };
}

async function enrichScholarshipData({ title, description, country, degreeLevel, fieldOfStudy, fundingType, eligibleCountries, eligibleFields, gpaRequirements, englishRequirements, sourceType }) {
  const promptParts = [
    "Extract enrichment metadata for this scholarship entry.",
    "Return JSON only with the exact fields: normalized_tags (array), funding_classification (string), eligibility_hints (string).",
    "Avoid extra explanation.",
    "If a value cannot be determined, use an empty array or empty string.",
    "Scholarship description:",
    title ? `Title: ${title}` : "",
    description ? `Description: ${description}` : "",
    country ? `Country: ${country}` : "",
    degreeLevel ? `Degree level: ${degreeLevel}` : "",
    fieldOfStudy ? `Field of study: ${fieldOfStudy}` : "",
    fundingType ? `Funding type: ${fundingType}` : "",
    eligibleCountries ? `Eligible countries: ${Array.isArray(eligibleCountries) ? eligibleCountries.join(", ") : eligibleCountries}` : "",
    eligibleFields ? `Eligible fields: ${Array.isArray(eligibleFields) ? eligibleFields.join(", ") : eligibleFields}` : "",
    gpaRequirements ? `GPA requirements: ${gpaRequirements}` : "",
    englishRequirements ? `English requirements: ${englishRequirements}` : "",
    sourceType ? `Source type: ${sourceType}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!openai) {
    return fallbackEnrichment({ title, description, fundingType, eligibleCountries, eligibleFields });
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: promptParts,
        },
      ],
      max_output_tokens: 200,
    });

    const text = response.output?.[0]?.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        normalizedTags: Array.isArray(parsed.normalized_tags) ? parsed.normalized_tags.map((t) => String(t).trim()).filter(Boolean) : [],
        fundingClassification: parsed.funding_classification ? String(parsed.funding_classification).trim() : fundingType || "financial support",
        eligibilityHints: parsed.eligibility_hints ? String(parsed.eligibility_hints).trim() : "",
      };
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("AI enrichment failed, falling back to heuristic metadata:", err.message);
  }

  return fallbackEnrichment({ title, description, fundingType, eligibleCountries, eligibleFields });
}

module.exports = {
  enrichScholarshipData,
};
