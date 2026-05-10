const axios = require("axios");
const cheerio = require("cheerio");
const { DiscoveryRepository } = require("../repositories/DiscoveryRepository");
const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");
const { enrichScholarshipData } = require("./aiEnrichmentService");
const { buildScholarshipEmbeddingText, getTextEmbedding } = require("./embeddingService");
const { detectDuplicateScholarship } = require("./duplicateDetectionService");

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

  const $ = cheerio.load(html || "");
  const title = normalizeWhitespace(
    $("head title").text() || $("h1").first().text() || fallbackTitle || "Scholarship opportunity"
  );
  const description = normalizeWhitespace(
    $("meta[name='description']").attr("content") || $("meta[property='og:description']").attr("content") || text.slice(0, 1600)
  );
  const deadline = parseDateCandidate(DEADLINE_PATTERN.exec(text)?.[1] || "");
  const degreeLevel = (() => {
    const match = /\b(high school|bachelor(?:'s)?|undergraduate|master(?:'s)?|postgraduate|phd|doctoral)\b/i.exec(text);
    return match ? match[1].toLowerCase().replace(/\bundergraduate\b/, "bachelor") : null;
  })();
  const fundingType = /\bfully funded\b/i.test(text)
    ? "fully funded"
    : /\b(partial|partially funded)\b/i.test(text)
      ? "partial funding"
      : /\btuition waiver\b/i.test(text)
        ? "tuition waiver"
        : /\b(grant|scholarship|fellowship|financial aid)\b/i.test(text)
          ? "financial support"
          : null;

  const eligibleCountries = Array.from(
    new Set(
      Array.from(text.matchAll(/\b(?!any\b)(?:international|global|usa|united states|canada|uk|united kingdom|germany|france|australia|japan|singapore|europe|china|india|brazil|south africa)\b/gi)).map((m) => m[0])
    )
  );

  const eligibleFields = Array.from(
    new Set(
      Array.from(text.matchAll(/\b(computer science|engineering|business|law|medicine|arts|social sciences|economics|math(?:ematics)?|science|education)\b/gi)).map((m) => m[0])
    )
  );

  const gpaRequirements = normalizeWhitespace((text.match(/(gpa\s*(?:of)?\s*(?:[:>=]|is)?\s*[0-4](?:\.[0-9])?)/i) || [])[1] || "");
  const englishRequirements = normalizeWhitespace((text.match(/\b(ielts|toefl|pte|duolingo)\b[^\.]{0,80}/i) || [])[0] || "");
  const eligibilitySnippet = normalizeWhitespace((text.match(/[^.]*\b(eligibility|eligible|requirements?)\b[^.]*\./i) || [])[0] || "");

  return {
    isScholarship: true,
    title,
    deadline,
    fundingType,
    degreeLevel,
    fieldOfStudy: eligibleFields.length ? eligibleFields[0] : null,
    eligibleCountries,
    eligibleFields,
    gpaRequirements: gpaRequirements || null,
    englishRequirements: englishRequirements || null,
    eligibilitySnippet,
    organizationName: (() => {
      try {
        return new URL(pageUrl).hostname.replace(/^www\./, "");
      } catch (_err) {
        return null;
      }
    })(),
    description,
    country: pickCountry(text),
    applicationUrl: pageUrl,
  };
}

async function collectSignals() {
  const sources = await discoveryRepo.listActiveSources();
  const summary = { sources: sources.length, collected: 0 };

  for (const source of sources) {
    try {
      const { data } = await axios.get(source.url, {
        timeout: 15000,
        responseType: "text",
        headers: { "User-Agent": "ScholarDiscoveryBot/1.0 (+scholar-backend)" },
      });

      const items = source.source_type === "sitemap"
        ? parseSitemap(String(data || ""))
        : source.source_type === "rss"
          ? parseRss(String(data || ""))
          : [{ title: source.name, link: source.url, publishedAt: null }];

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
        sourceDomain: String(new URL(row.source_url || row.item_url).hostname || "").toLowerCase(),
        text: extracted.description,
        pageUrl: row.item_url,
        deadline: extracted.deadline,
        eligibilitySnippet: extracted.eligibilitySnippet,
      });

      const enrichment = await enrichScholarshipData({
        title: extracted.title,
        description: extracted.description,
        country: extracted.country,
        degreeLevel: extracted.degreeLevel,
        fieldOfStudy: extracted.fieldOfStudy,
        fundingType: extracted.fundingType,
        eligibleCountries: extracted.eligibleCountries,
        eligibleFields: extracted.eligibleFields,
        gpaRequirements: extracted.gpaRequirements,
        englishRequirements: extracted.englishRequirements,
        sourceType: row.source_type,
      });

      const embedding = await getTextEmbedding(
        buildScholarshipEmbeddingText({
          title: extracted.title,
          description: extracted.description,
          funding_type: extracted.fundingType,
          country: extracted.country,
          degree_level: extracted.degreeLevel,
          field_of_study: extracted.fieldOfStudy,
          organization_name: extracted.organizationName,
        })
      );

      const duplicateCheck = await detectDuplicateScholarship({
        title: extracted.title,
        organizationName: extracted.organizationName,
        applicationUrl: row.item_url,
        sourceUrl: row.item_url,
        deadline: extracted.deadline,
        embedding,
      });

      await scholarshipRepo.upsertDiscoveredScholarship({
        title: extracted.title,
        country: extracted.country || "International",
        degreeLevel: extracted.degreeLevel,
        fieldOfStudy: extracted.fieldOfStudy,
        fundingType: extracted.fundingType,
        deadline: extracted.deadline,
        amount: null,
        description: `${extracted.description}\n\nVerification: score=${verification.score}, risk=${verification.risk}, flags=${JSON.stringify(verification.flags)}`,
        applicationUrl: row.item_url,
        sourceId: row.source_id,
        sourceName: row.source_name || "Auto discovery",
        sourceUrl: row.item_url,
        externalId: row.id,
        aiConfidence: verification.probability,
        extractionConfidence: Math.min(
          1,
          Math.max(
            0,
            (verification.score / 100) +
              (Array.isArray(extracted.eligibleCountries) && extracted.eligibleCountries.length ? 0.1 : 0) +
              (Array.isArray(extracted.eligibleFields) && extracted.eligibleFields.length ? 0.1 : 0)
          )
        ),
        normalizedTags: enrichment.normalizedTags,
        fundingClassification: enrichment.fundingClassification,
        eligibilityHints: enrichment.eligibilityHints,
        eligibleCountries: extracted.eligibleCountries,
        eligibleFields: extracted.eligibleFields,
        gpaRequirements: extracted.gpaRequirements,
        englishRequirements: extracted.englishRequirements,
        extractionMetadata: {
          sourceType: row.source_type,
          trustScore: row.trust_score,
          payload: row.payload,
        },
        duplicateMetadata: duplicateCheck,
        embedding,
      });

      await discoveryRepo.markRawItemProcessed(row.id);
      await discoveryRepo.touchSource(row.source_id);
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
  extractFromText,
};

