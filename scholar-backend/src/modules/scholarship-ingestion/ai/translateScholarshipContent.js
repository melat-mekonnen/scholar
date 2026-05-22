const { chatCompletion } = require("./openRouterClient");
const { env } = require("../../../config/env");

const TRANSLATE_SYSTEM = `You translate scholarship listings into Amharic for Ethiopian students.
Preserve markdown section headings exactly (## Overview, etc.) but translate heading text to Amharic equivalents:
## አጠቃላይ መግለጫ
## ብቁነት
## የገንዘብ ድጋፍ
## መሳሪያ ቀናት
## እንዴት መመልከት
## ኦፊሴላዊ አገናኞች
Do not invent facts. Keep URLs unchanged. Translate title separately when asked.`;

async function translateToAmharic({ title, description }) {
  if (!env.openRouterApiKey) {
    return { titleAm: null, descriptionAm: null, source: "skipped" };
  }

  const user = `Translate this scholarship listing to Amharic.

Title:
${title}

Description:
${description}

Respond in JSON only:
{"titleAm":"...","descriptionAm":"..."}`;

  try {
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
  } catch (err) {
    return { titleAm: null, descriptionAm: null, source: "error", error: err.message };
  }
}

module.exports = {
  translateToAmharic,
};
