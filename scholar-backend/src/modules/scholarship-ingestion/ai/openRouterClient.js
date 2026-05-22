const axios = require("axios");
const { env } = require("../../../config/env");

async function chatCompletion({ system, user, temperature = 0.2, maxTokens = 1800 }) {
  if (!env.openRouterApiKey) {
    const err = new Error("OPENROUTER_API_KEY is not configured");
    err.code = "OPENROUTER_DISABLED";
    throw err;
  }

  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: env.openRouterModel,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    {
      timeout: 90000,
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.frontendAppUrl,
        "X-Title": "Scholar Platform",
      },
    },
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content || !String(content).trim()) {
    throw new Error("OpenRouter returned empty content");
  }
  return String(content).trim();
}

module.exports = {
  chatCompletion,
};
