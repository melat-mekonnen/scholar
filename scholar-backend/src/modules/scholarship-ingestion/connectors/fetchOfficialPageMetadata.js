const axios = require("axios");
const { enrichRecordFromHtml } = require("./enrichPageFromHtml");

async function fetchOfficialPageMetadata(url, options = {}) {
  const response = await axios.get(url, {
    timeout: Number(options.timeout || 35000),
    headers: {
      "User-Agent":
        "ScholarPlatformBot/1.0 (+https://localhost; scholarship ingestion public data)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  const html = String(response.data || "");
  return enrichRecordFromHtml(html, url);
}
async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOfficialPageMetadataWithRetry(url, options = {}) {
  const retries = Number(options.retries || 2);
  const baseDelayMs = Number(options.baseDelayMs || 800);
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fetchOfficialPageMetadata(url, {
        timeout: options.timeout,
      });
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(baseDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError;
}

module.exports = { fetchOfficialPageMetadata, fetchOfficialPageMetadataWithRetry };
