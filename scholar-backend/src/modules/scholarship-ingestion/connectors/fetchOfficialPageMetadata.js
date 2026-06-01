const axios = require("axios");
const { enrichRecordFromHtml } = require("./enrichPageFromHtml");

async function fetchOfficialPageMetadata(url, options = {}) {
  const response = await axios.get(url, {
    timeout: Number(options.timeout || 35000),
    headers: {
      "User-Agent":
        options.userAgent ||
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400,
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
