const axios = require("axios");
const { DiscoveryRepository } = require("../repositories/DiscoveryRepository");
const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");

const discoveryRepo = new DiscoveryRepository();
const scholarshipRepo = new ScholarshipRepository();

const SCHOLARSHIP_PATTERN = /\b(scholarship|fellowship|grant|tuition waiver|financial aid|fully funded)\b/i;
const DEADLINE_PATTERN =
  /\b(?:deadline|apply by|last date)\s*[:\-]?\s*([a-z]{3,9}\s+\d{1,2},\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function normalizeWhitespace(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function stripHtml(html) {
  return normalizeWhitespace(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&"),
  );
}

function readTag(entry, tagName) {
  const match = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i").exec(entry || "");
  return normalizeWhitespace(match?.[1] || "");
}

function parseRss(xml) {
  const chunks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return chunks
    .map((entry) => {
      const title = readTag(entry, "title");
      const link =
        readTag(entry, "link") ||
        normalizeWhitespace(/<link[^>]*href="([^"]+)"/i.exec(entry || "")?.[1] || "");
      const publishedAt = readTag(entry, "pubDate") || readTag(entry, "updated") || readTag(entry, "published");
      return { title, link, publishedAt };
    })
    .filter((item) => item.link);
}

function parseSitemap(xml) {
  const urls = xml.match(/<url[\s\S]*?<\/url>/gi) || [];
  return urls
    .map((chunk) => ({
      title: "",
      link: readTag(chunk, "loc"),
      publishedAt: readTag(chunk, "lastmod"),
    }))
    .filter((item) => item.link);
}

function parseDateCandidate(value) {
  if (!value) return null;
  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) return asDate.toISOString().slice(0, 10);
  return null;
}

function pickCountry(text) {
  const match = /\b(international|global|usa|united states|canada|uk|united kingdom|germany|france|australia|japan|singapore|europe)\b/i.exec(
    text || "",
  );
  if (!match) return "International";
  const value = match[1].toLowerCase();
  if (value === "usa") return "United States";
  if (value === "uk") return "United Kingdom";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function scoreCandidate({ sourceDomain, text, pageUrl, deadline, eligibilitySnippet }) {
  const urlDomain = (() => {
    try {
      return new URL(pageUrl).hostname.toLowerCase();
    } catch (_err) {
      return "";
    }
  })();

  const officialDomain = Boolean(urlDomain) && (urlDomain.endsWith(".edu") || urlDomain.endsWith(".gov") || urlDomain === sourceDomain);
  const hasDeadline = Boolean(deadline);
  const hasEligibility = Boolean(eligibilitySnippet);
  const emails = text.match(EMAIL_PATTERN) || [];
  const hasContact = emails.some((email) => {
    const emailDomain = email.split("@")[1]?.toLowerCase();
    return emailDomain && (urlDomain.endsWith(emailDomain) || emailDomain.endsWith(urlDomain));
  });
  const cleanContent = !/\b(win money fast|crypto giveaway|click here now|bonus claim)\b/i.test(text || "");

  const score =
    (officialDomain ? 30 : 0) +
    (hasDeadline ? 20 : 0) +
    (hasEligibility ? 20 : 0) +
    (hasContact ? 15 : 0) +
    (cleanContent ? 15 : 0);

  const risk = score >= 75 ? "low" : score >= 50 ? "medium" : "high";

  return {
    score,
    risk,
    probability: Number((score / 100).toFixed(2)),
    flags: {
      officialDomain,
      hasDeadline,
      hasEligibility,
      hasContact,
      cleanContent,
    },
  };
}

function extractFromText({ html, fallbackTitle, pageUrl }) {
  const text = stripHtml(html);
  if (!SCHOLARSHIP_PATTERN.test(text)) {
    return { isScholarship: false };
  }

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html || "");
  const title = normalizeWhitespace(titleMatch?.[1] || fallbackTitle || "Scholarship opportunity");
  const deadline = parseDateCandidate(DEADLINE_PATTERN.exec(text)?.[1] || "");
  const fundingType = /\bfully funded\b/i.test(text)
    ? "fully funded"
    : /\b(partial|partially funded)\b/i.test(text)
      ? "partial funding"
      : /\btuition waiver\b/i.test(text)
        ? "tuition waiver"
        : "financial support";
  const eligibilitySentence = (text.match(/[^.]*\b(eligibility|eligible|requirements?)\b[^.]*\./i) || [])[0] || "";

  return {
    isScholarship: true,
    title,
    deadline,
    fundingType,
    eligibilitySnippet: normalizeWhitespace(eligibilitySentence),
    organizationName: (() => {
      try {
        return new URL(pageUrl).hostname.replace(/^www\./, "");
      } catch (_err) {
        return null;
      }
    })(),
    description: text.slice(0, 1500),
    country: pickCountry(text),
  };
}

async function collectSignals() {
  const sources = await discoveryRepo.listActiveSources();
  const summary = { sources: sources.length, collected: 0 };

  for (const source of sources) {
    try {
      const { data } = await axios.get(source.source_url, {
        timeout: 15000,
        responseType: "text",
        headers: { "User-Agent": "ScholarDiscoveryBot/1.0 (+scholar-backend)" },
      });

      const items = source.source_type === "sitemap" ? parseSitemap(String(data || "")) : parseRss(String(data || ""));
      for (const item of items) {
        const inserted = await discoveryRepo.saveRawItem({
          sourceId: source.id,
          itemTitle: item.title,
          itemUrl: item.link,
          publishedAt: parseDateCandidate(item.publishedAt),
          payload: item,
        });
        if (inserted) summary.collected += 1;
      }
      await discoveryRepo.touchSource(source.id);
    } catch (_err) {
      // keep the collector resilient; source-level failures should not stop batch.
    }
  }

  return summary;
}

async function processSignals({ limit = 25 } = {}) {
  const rows = await discoveryRepo.listUnprocessedItems(limit);
  const summary = { processed: 0, candidates: 0 };

  for (const row of rows) {
    try {
      const { data: html } = await axios.get(row.item_url, {
        timeout: 15000,
        responseType: "text",
        headers: { "User-Agent": "ScholarDiscoveryBot/1.0 (+scholar-backend)" },
      });

      const extracted = extractFromText({
        html: String(html || ""),
        fallbackTitle: row.item_title,
        pageUrl: row.item_url,
      });

      if (!extracted.isScholarship) {
        await discoveryRepo.markRawItemProcessed(row.id, "not_scholarship");
        summary.processed += 1;
        continue;
      }

      const verification = scoreCandidate({
        sourceDomain: String(row.domain || "").toLowerCase(),
        text: extracted.description,
        pageUrl: row.item_url,
        deadline: extracted.deadline,
        eligibilitySnippet: extracted.eligibilitySnippet,
      });

      await scholarshipRepo.upsertDiscoveredScholarship({
        title: extracted.title,
        country: extracted.country || "International",
        degreeLevel: null,
        fieldOfStudy: null,
        fundingType: extracted.fundingType,
        deadline: extracted.deadline,
        amount: null,
        description: `${extracted.description}\n\nVerification: score=${verification.score}, risk=${verification.risk}, flags=${JSON.stringify(verification.flags)}`,
        applicationUrl: row.item_url,
        sourceName: row.source_name || "Auto discovery",
        sourceUrl: row.item_url,
        externalId: row.id,
        aiConfidence: verification.probability,
      });

      await discoveryRepo.markRawItemProcessed(row.id);
      summary.processed += 1;
      summary.candidates += 1;
    } catch (err) {
      await discoveryRepo.markRawItemProcessed(row.id, String(err.message || "processing_failed").slice(0, 200));
      summary.processed += 1;
    }
  }

  return summary;
}

async function runDiscoveryPipeline({ limit = 25 } = {}) {
  const collect = await collectSignals();
  const process = await processSignals({ limit });
  return { collect, process };
}

module.exports = {
  runDiscoveryPipeline,
  collectSignals,
  processSignals,
};

