const MONTHS = {
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

const ROLLING_PATTERNS = [
  /\brolling\b/i,
  /\byear[- ]round\b/i,
  /\bongoing\b/i,
  /\bopen now\b/i,
  /\bno fixed deadline\b/i,
  /\bdeadlines?\s+vary\b/i,
  /\bcheck (the\s+)?(official\s+)?(site|page|website)\b/i,
];

/** Official application windows for curated leaf cycles (YYYY-MM-DD). */
const KNOWN_CYCLES = [
  {
    match: /chevening/i,
    academicYear: /2026[-/ ]?2027|2026\/27/i,
    applicationStartDate: "2025-08-05",
    applicationEndDate: "2025-11-04",
  },
  {
    match: /commonwealth shared scholarship/i,
    academicYear: /2026\/27|2026[-/ ]?2027/i,
    applicationStartDate: "2025-11-13",
    applicationEndDate: "2025-12-09",
  },
  {
    match: /commonwealth distance learning/i,
    academicYear: /2026\/27|2026[-/ ]?2027/i,
    applicationStartDate: "2025-11-13",
    applicationEndDate: "2026-03-27",
  },
  {
    match: /commonwealth master'?s scholarship/i,
    academicYear: /2026\/27|2026[-/ ]?2027/i,
    applicationStartDate: "2025-09-01",
    applicationEndDate: "2025-10-14",
  },
];

function isValidIsoDay(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function toIsoDate(y, m, d) {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  const iso = `${y}-${mm}-${dd}`;
  return isValidIsoDay(iso) ? iso : null;
}

function addMonths(iso, delta) {
  if (!isValidIsoDay(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1 + delta, d);
  return toIsoDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

function parseNamedMonthDate(text) {
  const raw = String(text || "");

  const m1 = raw.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\b/i,
  );
  if (m1) {
    const mm = MONTHS[m1[1].toLowerCase()];
    return toIsoDate(Number(m1[3]), Number(mm), Number(m1[2]));
  }

  const m2 = raw.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i,
  );
  if (m2) {
    const mm = MONTHS[m2[2].toLowerCase()];
    return toIsoDate(Number(m2[3]), Number(mm), Number(m2[1]));
  }

  const m3 = raw.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (m3) {
    return toIsoDate(Number(m3[3]), Number(m3[1]), Number(m3[2]));
  }

  return null;
}

function parseIsoFromText(text) {
  const match = String(text || "").match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (!match) return null;
  return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function extractLabeledDate(text, patterns) {
  const raw = String(text || "");
  for (const pattern of patterns) {
    const m = raw.match(pattern);
    if (!m) continue;
    const fragment = m[1] || m[0];
    return parseIsoFromText(fragment) || parseNamedMonthDate(fragment);
  }
  return null;
}

function extractOpenDate(text) {
  return extractLabeledDate(text, [
    /application[s]?\s+open[s]?(?:\s+on|\s+from|\s*:)?\s*([^.\n;]+)/i,
    /opens?\s+on\s+([^.\n;]+)/i,
    /open(?:ing)?\s+date\s*:?\s*([^.\n;]+)/i,
    /apply\s+from\s+([^.\n;]+)/i,
  ]);
}

function extractCloseDate(text) {
  return extractLabeledDate(text, [
    /application[s]?\s+close[s]?(?:\s+on|\s+by|\s*:)?\s*([^.\n;]+)/i,
    /deadline[s]?(?:\s+for\s+applications?|\s+to\s+apply)?\s*:?\s*([^.\n;]+)/i,
    /apply\s+by\s+([^.\n;]+)/i,
    /closing\s+date\s*:?\s*([^.\n;]+)/i,
    /closes?\s+on\s+([^.\n;]+)/i,
  ]);
}

function extractProgrammeStartDate(text) {
  return extractLabeledDate(text, [
    /\bstarts?\s+(20\d{2}-\d{2}-\d{2})\b/i,
    /\bstarting\s+(20\d{2}-\d{2}-\d{2})\b/i,
    /\bbeginning\s+(January|February|March|April|May|June|July|August|September|October|November|December)[^.\n]{0,20}(20\d{2})/i,
    /\bintake\s+(20\d{2}-\d{2}-\d{2})\b/i,
  ]);
}

function inferStudyProgrammeWindow(programmeStartDate, degreeLevel) {
  if (!isValidIsoDay(programmeStartDate)) return { applicationStartDate: null, applicationEndDate: null };
  const monthsBeforeOpen = 12;
  const monthsBeforeClose = degreeLevel === "bachelor" ? 8 : 4;
  return {
    applicationStartDate: addMonths(programmeStartDate, -monthsBeforeOpen),
    applicationEndDate: addMonths(programmeStartDate, -monthsBeforeClose),
  };
}

function inferKnownCycleDates(record) {
  const hay = `${record.title || ""} ${record.description || ""}`;
  for (const cycle of KNOWN_CYCLES) {
    if (!cycle.match.test(hay)) continue;
    if (cycle.academicYear && !cycle.academicYear.test(hay)) continue;
    return {
      applicationStartDate: cycle.applicationStartDate,
      applicationEndDate: cycle.applicationEndDate,
    };
  }
  return null;
}

function textIndicatesRolling(text) {
  return ROLLING_PATTERNS.some((re) => re.test(String(text || "")));
}

function coalesceDate(...values) {
  for (const value of values) {
    if (isValidIsoDay(value)) return value;
  }
  return null;
}

/** Human-readable label, e.g. "May 31, 2026". */
function formatDateHumanReadable(iso, locale = "en-US") {
  if (!isValidIsoDay(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Resolve structured application window dates from record fields and free text.
 * @param {object} record
 * @returns {{ applicationStartDate: string|null, applicationEndDate: string|null, deadline: string|null, isRolling: boolean }}
 */
function resolveApplicationDates(record = {}) {
  const text = `${record.title || ""}\n${record.description || ""}`.trim();
  const degreeLevel = String(record.degreeLevel || "").toLowerCase();
  const recordType = record.recordType || "scholarship";

  let applicationStartDate = coalesceDate(
    record.applicationStartDate,
    record.startDate,
  );
  let applicationEndDate = coalesceDate(
    record.applicationEndDate,
    record.endDate,
    record.deadline,
  );
  let deadline = coalesceDate(record.deadline, applicationEndDate);

  if (!applicationStartDate) applicationStartDate = extractOpenDate(text);
  if (!applicationEndDate) applicationEndDate = extractCloseDate(text);
  if (!deadline) deadline = applicationEndDate;

  const programmeStartDate = coalesceDate(
    record.programmeStartDate,
    extractProgrammeStartDate(text),
  );

  if ((!applicationStartDate || !applicationEndDate) && programmeStartDate) {
    const inferred = inferStudyProgrammeWindow(programmeStartDate, degreeLevel);
    applicationStartDate = applicationStartDate || inferred.applicationStartDate;
    applicationEndDate = applicationEndDate || inferred.applicationEndDate;
    deadline = deadline || applicationEndDate;
  }

  if ((!applicationStartDate || !applicationEndDate) && recordType !== "study_programme") {
    const cycle = inferKnownCycleDates(record);
    if (cycle) {
      applicationStartDate = applicationStartDate || cycle.applicationStartDate;
      applicationEndDate = applicationEndDate || cycle.applicationEndDate;
      deadline = deadline || cycle.applicationEndDate;
    }
  }

  if (applicationEndDate && !applicationStartDate && recordType === "study_programme") {
    applicationStartDate = addMonths(applicationEndDate, -9);
  }

  if (applicationStartDate && !applicationEndDate && !programmeStartDate) {
    applicationEndDate = addMonths(applicationStartDate, 3);
    deadline = deadline || applicationEndDate;
  }

  if (applicationEndDate) deadline = applicationEndDate;

  let isRolling = Boolean(record.isRolling);
  if (applicationEndDate || deadline) {
    isRolling = false;
  } else if (!textIndicatesRolling(text)) {
    isRolling = false;
  } else if (textIndicatesRolling(text)) {
    isRolling = true;
  }

  return {
    applicationStartDate: applicationStartDate || null,
    applicationEndDate: applicationEndDate || null,
    deadline: deadline || null,
    isRolling,
  };
}

function formatImportantDatesSection(dates) {
  const lines = [];
  const open = formatDateHumanReadable(dates.applicationStartDate);
  const close = formatDateHumanReadable(dates.applicationEndDate || dates.deadline);
  if (open) lines.push(`Applications open: ${open}`);
  if (close) lines.push(`Applications close: ${close}`);
  if (dates.isRolling && !close) {
    lines.push("Rolling intake — check the official page for current deadlines.");
  }
  return lines.join("\n");
}

module.exports = {
  resolveApplicationDates,
  formatDateHumanReadable,
  formatImportantDatesSection,
  parseNamedMonthDate,
  parseIsoFromText,
  extractOpenDate,
  extractCloseDate,
  extractProgrammeStartDate,
  isValidIsoDay,
};
