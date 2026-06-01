const crypto = require("crypto");
const axios = require("axios");

const INSTITUTIONS_HUB =
  "https://www.adb.org/work-with-us/careers/japan-scholarship-program/institutions";
const PROGRAM_OVERVIEW =
  "https://www.adb.org/work-with-us/careers/japan-scholarship-program";

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHttpUrl(url) {
  const trimmed = String(url || "")
    .trim()
    .replace(/&amp;/g, "&");
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice(7)}`;
  return trimmed;
}

function normalizeProgramApplyUrl(url) {
  const normalized = normalizeHttpUrl(url);
  try {
    const parsed = new URL(normalized);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    if (parsed.hostname === "www.econ.kyoto-u.ac.jp" && path === "/kueac") {
      parsed.pathname = "/kueac/application/masters/";
      return parsed.toString();
    }
    if (parsed.hostname === "www.gsm.kyoto-u.ac.jp" && /\/admissions\/infomation\/international$/i.test(path)) {
      return "https://www.gsm.kyoto-u.ac.jp/en/admissions/guidelines/international/";
    }
    if (parsed.hostname === "www.iuj.ac.jp") {
      if (path === "/gsir") return "https://www.iuj.ac.jp/admissions/ir_linkage/";
      if (path === "/gsim") return "https://www.iuj.ac.jp/admissions/im_linkage/";
      if (path === "" || path === "/") return "https://www.iuj.ac.jp/admissions/";
    }
    if (parsed.hostname === "sites.google.com" && /tohoku\.ac\.jp\/(iphs|gses-adb-jsp)/i.test(normalized)) {
      return "https://www.kankyo.tohoku.ac.jp/en/adm.html";
    }
    if (parsed.hostname === "www.keio.ac.jp" && path === "/ja/st") {
      return "https://www.st.keio.ac.jp/en/admissions/scholarships.html";
    }
    if (
      parsed.hostname === "unu.edu" &&
      /\/ias\/masters-degree\/sustainability$/i.test(path)
    ) {
      return "https://unu.edu/ias/admissions";
    }
    if (parsed.hostname === "www.kankyo.tohoku.ac.jp" && (path === "/en" || path === "")) {
      return "https://www.kankyo.tohoku.ac.jp/en/adm.html";
    }
  } catch {
    return normalized;
  }
  return normalized;
}

const URL_APPLY_SIGNALS =
  /scholarship|admission|admissions|apply|application|exam|guidelines|adb-jsp|jsp|mba|mppip|inter_programs|global30|mci|urd|msgfin|environmental-management|training\.irri|degree_seeking|entrance_exam|kueac|programsinenglish|\/gsir|\/gsim|\/iemp|\/tpm\.html|intl\.|human-security/i;

function isGenericFacultyHomepage(url, text) {
  const t = String(text || "").trim();
  if (!/^graduate school of /i.test(t)) return false;
  if (/international course|master'?s|program|mba|doctoral|fellowship/i.test(t)) return false;
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "") || "/";
    const segments = path.split("/").filter(Boolean);
    if (segments.length <= 1 && (!segments[0] || /^(en|english|jp)$/i.test(segments[0]))) return true;
    if (segments.length === 0) return true;
  } catch {
    return false;
  }
  return !URL_APPLY_SIGNALS.test(String(url).toLowerCase());
}

function isSpecificProgramUrl(url, text) {
  const u = url.toLowerCase();
  const t = text.toLowerCase();
  if (/development\.asia|events\.development/i.test(u)) return false;
  if (t === "website" || t === "more information" || t.startsWith("http")) return false;
  if (/facebook|twitter|youtube|linkedin|flickr|instagram/i.test(u)) return false;
  if (/sites\.google\.com\/tohoku\.ac\.jp/i.test(u)) return false;
  if (isGenericFacultyHomepage(url, text)) return false;

  if (URL_APPLY_SIGNALS.test(u)) return true;
  if (/international course|master'?s program|doctoral program/i.test(text)) return true;
  if (text.length > 55 && URL_APPLY_SIGNALS.test(t)) return true;

  try {
    const path = new URL(url).pathname.replace(/\/+$/, "") || "/";
    const depth = path.split("/").filter(Boolean).length;
    if (depth >= 3 && URL_APPLY_SIGNALS.test(u)) return true;
  } catch {
    return false;
  }
  return false;
}

function pageIsDeadOrMissing(html, status) {
  if (status === 404 || status === 410) return true;
  const body = String(html || "");
  return /page not found|could not be found|the page you are looking for/i.test(body);
}

const CLOSED_PAGE_PATTERNS = [
  /application\s+period\s+(for\s+[^.]{0,120}\s+)?has\s+ended/i,
  /treated\s+as\s+reference\s+only/i,
  /thank\s+you\s+to\s+all\s+who\s+applied/i,
  /applications?\s+(are\s+)?(now\s+)?closed/i,
];

function pageDeclaresClosed(html) {
  const body = String(html || "");
  return CLOSED_PAGE_PATTERNS.some((re) => re.test(body));
}

function parseDeadlineFromHtml(html) {
  const end = String(html || "").match(
    /~\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}),\s*(\d{4})/i,
  );
  if (!end) return null;
  const months = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  const parts = end[1].trim().split(/\s+/);
  const month = months[parts[0]?.toLowerCase()];
  const day = String(Number.parseInt(parts[1], 10)).padStart(2, "0");
  const year = end[2];
  if (!month || !day || !year) return null;
  return `${year}-${month}-${day}`;
}

async function enrichProgrammeStatus(item) {
  try {
    const response = await axios.get(item.applicationUrl, {
      headers: REQUEST_HEADERS,
      timeout: 22000,
      maxRedirects: 5,
      validateStatus: () => true,
      responseType: "text",
      transformResponse: [(d) => d],
    });
    const html = String(response.data || "");
    if (pageIsDeadOrMissing(html, response.status)) {
      return { ...item, dead: true };
    }
    if (response.status < 200 || response.status >= 400) return { ...item, dead: true };
    if (!pageDeclaresClosed(html)) return item;
    return {
      ...item,
      applicationStatus: "closed",
      deadline: parseDeadlineFromHtml(html) || item.deadline || null,
    };
  } catch {
    return { ...item, dead: true };
  }
}

function parseInstitutionProgrammes(html) {
  const items = [];
  const body = String(html);

  const re = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(body)) !== null) {
    const href = normalizeHttpUrl(match[1]);
    const text = stripTags(match[2]);
    if (!href || href.includes("adb.org")) continue;
    if (!isSpecificProgramUrl(href, text)) continue;
    items.push({ title: text, applicationUrl: normalizeProgramApplyUrl(href) });
  }

  const tableProgrammeRe =
    /<li>\s*<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([^<]{12,220})<\/a>/gi;
  while ((match = tableProgrammeRe.exec(body)) !== null) {
    const href = normalizeHttpUrl(match[1]);
    const text = stripTags(match[2]);
    if (!href || href.includes("adb.org")) continue;
    if (!isSpecificProgramUrl(href, text)) continue;
    items.push({ title: text, applicationUrl: normalizeProgramApplyUrl(href) });
  }

  const seen = new Set();
  return items.filter((item) => {
    const key = item.applicationUrl.toLowerCase().replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchInstitutionProgrammes(options = {}) {
  const checkPages = options.checkPages !== false;
  const delayMs = options.delayMs ?? 80;
  const response = await axios.get(INSTITUTIONS_HUB, {
    headers: REQUEST_HEADERS,
    timeout: 35000,
    maxRedirects: 5,
  });
  const parsed = parseInstitutionProgrammes(response.data);
  if (!checkPages) return parsed;

  const enriched = [];
  for (const item of parsed) {
    // eslint-disable-next-line no-await-in-loop
    const next = await enrichProgrammeStatus(item);
    if (next.dead) continue;
    enriched.push(next);
    if (delayMs > 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return enriched;
}

function buildProgrammeTitle(linkTitle) {
  const clean = stripTags(linkTitle);
  if (/^adb/i.test(clean)) return clean;
  return `ADB-JSP — ${clean}`;
}

function buildProgrammeDescription(item) {
  return (
    `${buildProgrammeTitle(item.title)} is a partner programme under the ADB–Japan Scholarship Program (ADB–JSP), ` +
    "which offers graduate scholarships for studies in economics, management, science and technology, and other development-related fields. " +
    "Apply directly through the partner institution page linked below. Deadlines vary by university and intake; confirm dates on the official site."
  );
}

function toImportRecord(item) {
  const hash = crypto
    .createHash("sha1")
    .update(item.applicationUrl.toLowerCase())
    .digest("hex")
    .slice(0, 14);
  const closed = item.applicationStatus === "closed";

  return {
    externalId: `adb-jsp-inst-${hash}`,
    title: buildProgrammeTitle(item.title),
    organizationName: "Asian Development Bank (ADB–JSP)",
    country: "Asia and the Pacific",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    description: closed
      ? `${buildProgrammeDescription(item)} The partner university page currently states that the application period has ended; treat as reference only until a new cycle is published.`
      : buildProgrammeDescription(item),
    applicationUrl: item.applicationUrl,
    sourceUrl: `${INSTITUTIONS_HUB}#${hash}`,
    isRolling: !closed,
    deadline: item.deadline || null,
    applicationStatus: item.applicationStatus || null,
    ingestionTier: "government_trusted",
    eligibleRegions: ["asia", "pacific", "developing"],
  };
}

function mainProgrammeRecord() {
  return {
    externalId: "adb-jsp-2027",
    title: "ADB-Japan Scholarship Program — Partner Institutions",
    organizationName: "Asian Development Bank",
    country: "Asia and the Pacific",
    degreeLevel: "master",
    fieldOfStudy: "Economics and development-related fields",
    fundingType: "fully_funded",
    description:
      "The ADB–Japan Scholarship Program (ADB–JSP) offers about 135 graduate scholarships per year at partner universities across Asia and the Pacific. " +
      "This listing links to the official partner institutions page where you can choose a university and apply to a specific degree programme. " +
      "Each consortium partner publishes its own deadlines and application steps.",
    applicationUrl: INSTITUTIONS_HUB,
    sourceUrl: PROGRAM_OVERVIEW,
    isRolling: true,
    ingestionTier: "government_trusted",
    eligibleRegions: ["asia", "pacific", "developing"],
  };
}

module.exports = {
  INSTITUTIONS_HUB,
  PROGRAM_OVERVIEW,
  parseInstitutionProgrammes,
  fetchInstitutionProgrammes,
  toImportRecord,
  mainProgrammeRecord,
  isSpecificProgramUrl,
  isGenericFacultyHomepage,
  normalizeProgramApplyUrl,
  pageIsDeadOrMissing,
};
