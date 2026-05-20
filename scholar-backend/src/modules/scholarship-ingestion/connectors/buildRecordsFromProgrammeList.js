const { buildRecordFromOfficialPage } = require("./officialPageRecord");

/**
 * Fetch official pages for a list of programme definitions (sequential, rate-friendly).
 */
async function buildRecordsFromProgrammeList(programmes, options = {}) {
  const { delayMs = 400, fetchOptions = {}, allowTrustedFallback = false } = options;
  const records = [];
  const seenUrls = new Set();

  for (const programme of programmes) {
    const url = programme.url;
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);

  // eslint-disable-next-line no-await-in-loop
    const record = await buildRecordFromOfficialPage({
      ...programme,
      allowTrustedFallback,
      fetchOptions,
    });
    if (record) {
      records.push(record);
    } else if (process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.warn("[ingest] skip (no site description):", url);
    }

    if (delayMs > 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return records;
}

module.exports = { buildRecordsFromProgrammeList };
