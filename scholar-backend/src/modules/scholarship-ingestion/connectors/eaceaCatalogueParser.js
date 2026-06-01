const crypto = require("crypto");
const axios = require("axios");
const { extractApplicationLinkFromHtml } = require("./enrichPageFromHtml");

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const ERASMUS_HUB =
  "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en";
const INTRA_AFRICA_HUB =
  "https://www.eacea.ec.europa.eu/scholarships/intra-africa-scholarships-0_en";

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHttpUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice(7)}`;
  return trimmed;
}

function parseErasmusMundusItems(html) {
  const items = [];
  const blocks = String(html).split(/ecl-content-block__title/);
  for (let i = 1; i < blocks.length; i += 1) {
    const block = blocks[i];
    const titleMatch = block.match(/href="([^"]+)"[\s\S]*?ecl-link__label">([^<]+)<\/span>/);
    const descMatch = block.match(
      /ecl-content-block__description[\s\S]*?<p>([^<]*)<br[\s\S]*?href="([^"]+)"/,
    );
    if (!titleMatch) continue;
    const applicationUrl = normalizeHttpUrl(titleMatch[1]);
    const sourceUrl = normalizeHttpUrl(descMatch ? descMatch[2] : applicationUrl);
    if (!applicationUrl.startsWith("https://")) continue;
    items.push({
      catalogue: "erasmus_mundus",
      title: stripTags(titleMatch[2]),
      acronym: descMatch
        ? stripTags(descMatch[1].replace(/\s*-\s*Project overview.*/i, ""))
        : "",
      applicationUrl,
      sourceUrl,
      hubUrl: ERASMUS_HUB,
    });
  }
  return items;
}

function parseIntraAfricaItems(html) {
  const items = [];
  const blocks = String(html).split(/ecl-content-block__title/);
  for (let i = 1; i < blocks.length; i += 1) {
    const block = blocks[i];
    const titleMatch = block.match(
      />([^<]{8,250})<\/div>\s*<div class="ecl-content-block__description"><p>([^<]*?)\s*-\s*<a href="([^"]+)"/,
    );
    if (!titleMatch) continue;
    const applicationUrl = normalizeHttpUrl(titleMatch[3]);
    if (!applicationUrl.startsWith("https://") && !applicationUrl.startsWith("http://")) continue;
    items.push({
      catalogue: "intra_africa",
      title: stripTags(titleMatch[1]),
      acronym: stripTags(titleMatch[2]),
      applicationUrl: normalizeHttpUrl(applicationUrl),
      sourceUrl: INTRA_AFRICA_HUB,
      hubUrl: INTRA_AFRICA_HUB,
    });
  }
  return items;
}

async function fetchHtml(url) {
  const response = await axios.get(url, {
    headers: REQUEST_HEADERS,
    timeout: 35000,
    maxRedirects: 5,
    validateStatus: () => true,
    responseType: "text",
    transformResponse: [(d) => d],
  });
  return { status: response.status, html: String(response.data || "") };
}

function pageIsDeadOrMissing(html, status) {
  if (status === 404 || status === 410) return true;
  const body = String(html || "");
  return /page not found|could not be found|the page you are looking for/i.test(body);
}

function isBareProgrammeHomepage(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "") || "/";
    const segments = path.split("/").filter(Boolean);
    return segments.length <= 1;
  } catch {
    return false;
  }
}

function normalizeResolvedApplyUrl(url, landingUrl) {
  const normalized = normalizeHttpUrl(url);
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    if (host === "application.master-waves.eu") {
      return "https://master-waves.eu/waves-applications-menu/waves-applications-2";
    }
    if (host === "we-team.education" && /\/apply-now\/?$/i.test(path)) {
      return "https://we-team.education/the-procedure-in-5-steps/";
    }
    if (host === "www.imrd.ugent.be") {
      return "https://imrd.eu/admission-application/";
    }
    if (host === "master-nanomed.eu" || host === "www.master-nanomed.eu") {
      return "https://nanomed.u-paris.fr/application/";
    }
    if (host === "master-digicrea.univ-st-etienne.fr" && (path === "" || path === "/")) {
      return "https://master-digicrea.univ-st-etienne.fr/en/join-digicrea/how-to-apply.html";
    }
    if (host === "www.campuschina.org") {
      return "https://studyinchina.csc.edu.cn/";
    }
  } catch {
    /* fall through */
  }
  if (/we-team\.education/i.test(String(landingUrl)) && /\/apply-now\/?$/i.test(normalized)) {
    return "https://we-team.education/the-procedure-in-5-steps/";
  }
  return normalized;
}

function pickBestApplyUrl(html, landingUrl) {
  if (/we-team\.education/i.test(landingUrl)) {
    const procedureMatch = html.match(
      /href=["']([^"']*the-procedure-in-5-steps\/?)["']/i,
    );
    if (procedureMatch) {
      try {
        return normalizeHttpUrl(new URL(procedureMatch[1], landingUrl).toString());
      } catch {
        /* fall through */
      }
    }
  }

  const applyNowMatch = html.match(/href=["']([^"']*\/apply-now\/?)["']/i);
  if (applyNowMatch) {
    try {
      const candidate = normalizeHttpUrl(new URL(applyNowMatch[1], landingUrl).toString());
      if (!/application\.master-waves\.eu/i.test(candidate)) {
        return normalizeResolvedApplyUrl(candidate, landingUrl);
      }
    } catch {
      /* fall through */
    }
  }
  const resolved = extractApplicationLinkFromHtml(html, landingUrl);
  if (resolved && resolved.replace(/\/+$/, "") !== landingUrl.replace(/\/+$/, "")) {
    return normalizeHttpUrl(resolved);
  }
  return normalizeHttpUrl(landingUrl);
}

async function resolveApplicationUrl(item) {
  const landing = item.applicationUrl;
  try {
    const { status, html } = await fetchHtml(landing);
    if (pageIsDeadOrMissing(html, status)) {
      return { ...item, dead: true };
    }
    if (status < 200 || status >= 400) {
      return { ...item, dead: true };
    }
    const applicationUrl =
      isBareProgrammeHomepage(landing) || !/\/(apply|admission|application)/i.test(landing)
        ? pickBestApplyUrl(html, landing)
        : landing;
    return {
      ...item,
      applicationUrl: normalizeResolvedApplyUrl(applicationUrl, landing),
    };
  } catch {
    return item;
  }
}

async function enrichCatalogueItems(items, options = {}) {
  const resolveApply = options.resolveApplyUrls !== false;
  const delayMs = options.resolveDelayMs ?? 80;
  if (!resolveApply) return items;

  const enriched = [];
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    const next = await resolveApplicationUrl(item);
    if (next.dead) continue;
    enriched.push(next);
    if (delayMs > 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return dedupeByApplicationUrl(enriched);
}

async function fetchErasmusMundusCatalogue(options = {}) {
  const maxPages = options.maxPages ?? 11;
  const delayMs = options.delayMs ?? 120;
  const all = [];

  for (let page = 0; page < maxPages; page += 1) {
    const url =
      page === 0 ? ERASMUS_HUB : `${ERASMUS_HUB}?page=${page}`;
    // eslint-disable-next-line no-await-in-loop
    const { html } = await fetchHtml(url);
    all.push(...parseErasmusMundusItems(html));
    if (delayMs > 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return enrichCatalogueItems(dedupeByApplicationUrl(all), options);
}

async function fetchIntraAfricaCatalogue(options = {}) {
  const maxPages = options.maxPages ?? 2;
  const delayMs = options.delayMs ?? 120;
  const all = [];

  for (let page = 0; page < maxPages; page += 1) {
    const url =
      page === 0 ? INTRA_AFRICA_HUB : `${INTRA_AFRICA_HUB}?page=${page}`;
    // eslint-disable-next-line no-await-in-loop
    const { html } = await fetchHtml(url);
    all.push(...parseIntraAfricaItems(html));
    if (delayMs > 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return enrichCatalogueItems(dedupeByApplicationUrl(all), options);
}

function dedupeByApplicationUrl(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.applicationUrl.toLowerCase().replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildCatalogueDescription(item) {
  const label =
    item.catalogue === "intra_africa"
      ? "Intra-Africa Academic Mobility Scheme scholarship catalogue"
      : "Erasmus Mundus Joint Master catalogue";
  const acronym = item.acronym ? ` Programme acronym: ${item.acronym}.` : "";
  return (
    `${item.title} is listed in the official ${label} published by the European Education and Culture Executive Agency (EACEA).${acronym} ` +
    "Students should apply through the official consortium programme website linked as the application URL. " +
    "Eligibility, scholarship amounts, deadlines, and required documents are defined by each consortium on their site."
  );
}

function toImportRecord(item) {
  const prefix = item.catalogue === "intra_africa" ? "eacea-ia" : "eacea-em";
  const hash = crypto
    .createHash("sha1")
    .update(item.applicationUrl.toLowerCase())
    .digest("hex")
    .slice(0, 14);
  const organizationName =
    item.catalogue === "intra_africa"
      ? "Intra-Africa Academic Mobility Scheme (EU)"
      : "Erasmus Mundus Joint Master (EU)";
  const country =
    item.catalogue === "intra_africa" ? "Africa (multiple countries)" : "European Union";

  return {
    externalId: `${prefix}-${hash}`,
    title: item.title,
    organizationName,
    country,
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    description: buildCatalogueDescription(item),
    applicationUrl: item.applicationUrl,
    sourceUrl:
      item.catalogue === "erasmus_mundus" &&
      /erasmus-plus\.ec\.europa\.eu|ec\.europa\.eu\/programmes\/erasmus-plus/i.test(
        item.sourceUrl,
      )
        ? item.sourceUrl
        : `${item.hubUrl}#${hash}`,
    isRolling: true,
    ingestionTier: "government_trusted",
    eligibleRegions:
      item.catalogue === "intra_africa"
        ? ["africa"]
        : ["africa", "europe", "developing", "commonwealth"],
  };
}

async function fetchAllEaceaCatalogueProgrammes(options = {}) {
  const [erasmus, intra] = await Promise.all([
    fetchErasmusMundusCatalogue(options),
    fetchIntraAfricaCatalogue(options),
  ]);
  return {
    erasmus,
    intra,
    all: [...erasmus, ...intra],
  };
}

module.exports = {
  ERASMUS_HUB,
  INTRA_AFRICA_HUB,
  parseErasmusMundusItems,
  parseIntraAfricaItems,
  fetchErasmusMundusCatalogue,
  fetchIntraAfricaCatalogue,
  fetchAllEaceaCatalogueProgrammes,
  buildCatalogueDescription,
  toImportRecord,
  resolveApplicationUrl,
  pickBestApplyUrl,
};
