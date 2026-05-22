/**
 * Discover Warwick UG/PG course URLs from official listing pages.
 * Usage: node scripts/crawl-warwick-programmes.js [--max=30]
 */
require("dotenv").config();

const axios = require("axios");
const { pool } = require("../../src/infra/db/neonClient");
const { StudyProgrammeRepository } = require("../../src/repositories/StudyProgrammeRepository");
const { maybeTranslateStudyProgramme } = require("../../src/services/scholarshipAmharicContent");
const { extractScholarshipFacts } = require("../../src/modules/scholarship-ingestion/ai/extractScholarshipFacts");
const { formatDescriptionFromFacts } = require("../../src/modules/scholarship-ingestion/ai/formatDescriptionSections");

const HEADERS = {
  "User-Agent": "ScholarPlatformBot/1.0 (+https://localhost; public course discovery)",
  Accept: "text/html",
};

const HUBS = [
  "https://warwick.ac.uk/study/undergraduate/courses/",
  "https://warwick.ac.uk/study/postgraduate/courses/",
];

function parseArgs() {
  const maxArg = process.argv.find((a) => a.startsWith("--max="));
  return { max: maxArg ? parseInt(maxArg.split("=")[1], 10) : 25 };
}

function slugToTitle(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

async function discoverLinks(hubUrl, pattern, max) {
  const res = await axios.get(hubUrl, { timeout: 30000, headers: HEADERS });
  const html = String(res.data || "");
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const seen = new Set();
  const out = [];
  for (const href of links) {
    let abs;
    try {
      abs = new URL(href, hubUrl).toString();
    } catch {
      continue;
    }
    if (!pattern.test(abs)) continue;
    const key = abs.replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key + "/");
    if (out.length >= max) break;
  }
  return out;
}

async function main() {
  const { max } = parseArgs();
  const repo = new StudyProgrammeRepository();
  let upserted = 0;

  const ugLinks = await discoverLinks(
    HUBS[0],
    /warwick\.ac\.uk\/study\/undergraduate\/courses\/[a-z0-9-]+\/?$/i,
    Math.ceil(max / 2),
  );
  const pgLinks = await discoverLinks(
    HUBS[1],
    /warwick\.ac\.uk\/study\/postgraduate\/courses\/[a-z0-9-]+\/?$/i,
    Math.floor(max / 2),
  );

  for (const url of ugLinks) {
    const slug = url.split("/").filter(Boolean).pop();
    const title = slug.startsWith("bsc") || slug.startsWith("ba") ? slugToTitle(slug.replace(/^(bsc|ba)-?/, "")) : slugToTitle(slug);
    const fullTitle = slug.toUpperCase().startsWith("BSC") ? `BSc ${title}` : slug.toUpperCase().startsWith("BA") ? `BA ${title}` : title;
    const record = {
      title: fullTitle,
      organizationName: "University of Warwick",
      country: "United Kingdom",
      degreeLevel: "bachelor",
      fieldOfStudy: title,
      fundingType: "not_funded",
      applicationUrl: url,
      sourceUrl: url,
      description: `${fullTitle} undergraduate degree at University of Warwick. International applicants welcome; tuition fees apply. Official course page: ${url}`,
      isRolling: true,
    };
    const facts = extractScholarshipFacts(record);
    const saved = await repo.upsertProgramme({
      ...record,
      hostCountry: "United Kingdom",
      description: formatDescriptionFromFacts(facts),
      extractedFacts: facts,
      externalId: `warwick-ug-${slug}`,
      status: "verified",
    });
    if (saved?.id) maybeTranslateStudyProgramme(saved.id);
    upserted += 1;
  }

  for (const url of pgLinks) {
    const slug = url.split("/").filter(Boolean).pop();
    const title = slugToTitle(slug);
    const record = {
      title,
      organizationName: "University of Warwick",
      country: "United Kingdom",
      degreeLevel: "master",
      fieldOfStudy: title,
      fundingType: "not_funded",
      applicationUrl: url,
      sourceUrl: url,
      description: `${title} postgraduate programme at University of Warwick. International applicants welcome; tuition fees apply. Official course page: ${url}`,
      isRolling: true,
    };
    const facts = extractScholarshipFacts(record);
    const saved = await repo.upsertProgramme({
      ...record,
      hostCountry: "United Kingdom",
      description: formatDescriptionFromFacts(facts),
      extractedFacts: facts,
      externalId: `warwick-pg-${slug}`,
      status: "verified",
    });
    if (saved?.id) maybeTranslateStudyProgramme(saved.id);
    upserted += 1;
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ upserted, ug: ugLinks.length, pg: pgLinks.length }, null, 2));
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
