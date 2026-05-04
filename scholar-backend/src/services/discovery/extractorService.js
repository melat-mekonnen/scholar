const axios = require("axios");
const { load } = require("cheerio");

const SCHOLARSHIP_KEYWORDS = /\b(scholarship|fellowship|grant|funded)\b/i;
const DEADLINE_REGEX =
  /\b(?:deadline|apply by|closing date|last date)\s*[:\-]?\s*([a-z]{3,9}\s+\d{1,2},\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i;

function detectScholarship(text) {
  return SCHOLARSHIP_KEYWORDS.test(String(text || ""));
}

function normalize(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function extractDataFromText({ pageTitle, text, pageUrl }) {
  const deadline = parseDate(DEADLINE_REGEX.exec(text)?.[1] || "");
  const funding =
    /\bfully funded\b/i.test(text)
      ? "fully funded"
      : /\b(partial|partially funded)\b/i.test(text)
        ? "partial funding"
        : /\bgrant\b/i.test(text)
          ? "grant"
          : "funded";
  const eligibilitySnippet = normalize((text.match(/[^.]*\b(eligibility|eligible|requirements?)\b[^.]*\./i) || [])[0] || "");
  const organization =
    normalize((text.match(/(?:university|institute|college)\s+of\s+[A-Z][A-Za-z\s]+/i) || [])[0] || "") ||
    (() => {
      try {
        return new URL(pageUrl).hostname.replace(/^www\./, "");
      } catch (_err) {
        return "";
      }
    })();

  return {
    title: pageTitle || "Scholarship opportunity",
    deadline,
    funding,
    university: organization || null,
    eligibility: eligibilitySnippet || null,
    textSample: text.slice(0, 1500),
  };
}

async function fetchAndExtractPage(url, fallbackTitle = "") {
  const { data } = await axios.get(url, {
    timeout: 20000,
    responseType: "text",
    headers: { "User-Agent": "ScholarshipCandidateBot/1.0" },
  });

  const html = String(data || "");
  const $ = load(html);
  $("script, style, noscript").remove();

  const pageTitle = normalize($("title").first().text() || fallbackTitle);
  const text = normalize($("body").text());

  return {
    text,
    pageTitle,
    extracted: extractDataFromText({ pageTitle, text, pageUrl: url }),
  };
}

module.exports = {
  detectScholarship,
  fetchAndExtractPage,
};

