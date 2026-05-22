const { chatCompletion } = require("./openRouterClient");
const { env } = require("../../../config/env");
const { googleTranslateText } = require("../../../utils/googleTranslate");

const TRANSLATE_SYSTEM = `You translate scholarship listings into Amharic for Ethiopian students.
Preserve markdown section headings (## ...) but translate heading text to Amharic.
Do not invent facts. Keep URLs and proper nouns unchanged when appropriate.
Translate title separately when asked.`;

async function translateWithOpenRouter({ title, description }) {
  const user = `Translate this scholarship listing to Amharic.

Title:
${title}

Description:
${description}

Respond in JSON only:
{"titleAm":"...","descriptionAm":"..."}`;

  const raw = await chatCompletion({
    system: TRANSLATE_SYSTEM,
    user,
    temperature: 0.1,
    maxTokens: 2200,
  });
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { titleAm: null, descriptionAm: null, source: "parse_error" };
  }
  const parsed = JSON.parse(jsonMatch[0]);
  return {
    titleAm: parsed.titleAm || null,
    descriptionAm: parsed.descriptionAm || null,
    source: "openrouter",
  };
}

async function translateWithGoogle({ title, description }) {
  const [titleAm, descriptionAm] = await Promise.all([
    googleTranslateText(String(title || "").trim()),
    googleTranslateText(String(description || "").trim()),
  ]);
  return {
    titleAm: titleAm || null,
    descriptionAm: descriptionAm || null,
    source: "google",
  };
}

async function translateMetadataToAmharic({
  organizationName,
  country,
  fieldOfStudy,
  hostCountry,
}) {
  const entries = [
    ["organizationNameAm", organizationName],
    ["countryAm", country],
    ["fieldOfStudyAm", fieldOfStudy],
    ["hostCountryAm", hostCountry],
  ].filter(([, value]) => Boolean(String(value || "").trim()));

  if (!entries.length) {
    return {
      organizationNameAm: null,
      countryAm: null,
      fieldOfStudyAm: null,
      hostCountryAm: null,
      source: "empty",
    };
  }

  const translated = await Promise.all(
    entries.map(([, value]) => googleTranslateText(String(value).trim())),
  );

  const result = {
    organizationNameAm: null,
    countryAm: null,
    fieldOfStudyAm: null,
    hostCountryAm: null,
    source: "google",
  };

  entries.forEach(([key], index) => {
    result[key] = translated[index] || null;
  });

  return result;
}

async function translateToAmharic({ title, description }) {
  const titleText = String(title || "").trim();
  const descriptionText = String(description || "").trim();
  if (!titleText && !descriptionText) {
    return { titleAm: null, descriptionAm: null, source: "empty" };
  }

  if (env.openRouterApiKey && env.aiTranslationEnabled) {
    try {
      const openRouter = await translateWithOpenRouter({
        title: titleText,
        description: descriptionText,
      });
      if (openRouter.titleAm && openRouter.descriptionAm) {
        return openRouter;
      }
    } catch (err) {
      if (!env.aiTranslationGoogleFallback) {
        return { titleAm: null, descriptionAm: null, source: "error", error: err.message };
      }
    }
  }

  if (env.aiTranslationGoogleFallback || env.aiTranslationEnabled) {
    try {
      return await translateWithGoogle({ title: titleText, description: descriptionText });
    } catch (err) {
      return { titleAm: null, descriptionAm: null, source: "error", error: err.message };
    }
  }

  return { titleAm: null, descriptionAm: null, source: "skipped" };
}

module.exports = {
  translateToAmharic,
  translateMetadataToAmharic,
};
