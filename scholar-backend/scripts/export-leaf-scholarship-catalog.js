/**
 * Export the configured leaf scholarship catalog (URLs, descriptions, application window).
 * Run: node scripts/export-leaf-scholarship-catalog.js
 * Optional: node scripts/export-leaf-scholarship-catalog.js --format=md --out=leaf-catalog.md
 */
const fs = require("fs");
const path = require("path");
const {
  leafProgrammeDefinitions,
  scrapeProgrammesWithDescriptions,
  catalogSummary,
  SCRAPE_PROGRAMME_DESCRIPTIONS,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");
const { buildLeafRecordsFromList } = require("../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");

function formatDate(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

function leafExportRows() {
  const leafRecords = buildLeafRecordsFromList(leafProgrammeDefinitions());
  return leafRecords.map((row) => ({
    family: "leaf",
    title: row.title,
    organization: row.organizationName,
    country: row.country,
    applyUrl: row.applicationUrl,
    sourceUrl: row.sourceUrl,
    description: row.description,
    startDate: row.applicationStartDate || null,
    endDate: row.applicationEndDate || null,
    deadline: row.deadline || null,
    amount: row.amount || null,
    degreeLevel: row.degreeLevel,
  }));
}

function scrapeExportRows() {
  return scrapeProgrammesWithDescriptions().map((programme) => ({
    family: "scrape",
    title: programme.titleHint || programme.externalId,
    organization: programme.organizationName,
    country: programme.country,
    applyUrl: programme.applicationUrl || programme.url,
    sourceUrl: programme.url,
    description: programme.curatedDescription || SCRAPE_PROGRAMME_DESCRIPTIONS[programme.externalId] || "",
    startDate: programme.applicationStartDate || null,
    endDate: programme.applicationEndDate || null,
    deadline: programme.deadline || null,
    amount: programme.amount || null,
    degreeLevel: programme.degreeLevel,
  }));
}

function toMarkdown(rows) {
  const lines = [
    "# Scholar leaf scholarship catalog",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Total entries: **${rows.length}**`,
    "",
  ];

  let index = 0;
  for (const row of rows) {
    index += 1;
    lines.push(`## ${index}. ${row.title}`);
    lines.push("");
    lines.push(`- **Organization:** ${row.organization || "—"}`);
    lines.push(`- **Country:** ${row.country || "—"}`);
    lines.push(`- **Degree level:** ${row.degreeLevel || "—"}`);
    lines.push(`- **Apply URL:** ${row.applyUrl || "—"}`);
    lines.push(`- **Source URL:** ${row.sourceUrl || "—"}`);
    lines.push(`- **Application start:** ${formatDate(row.startDate)}`);
    lines.push(`- **Application end:** ${formatDate(row.endDate)}`);
    lines.push(`- **Deadline:** ${formatDate(row.deadline)}`);
    lines.push(`- **Amount / awards:** ${row.amount || "—"}`);
    lines.push("");
    lines.push("**Description:**");
    lines.push("");
    lines.push(row.description || "—");
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const formatArg = args.find((a) => a.startsWith("--format="));
  const outArg = args.find((a) => a.startsWith("--out="));
  const format = formatArg ? formatArg.split("=")[1] : "json";
  const outPath = outArg ? outArg.split("=")[1] : null;

  const rows = [...leafExportRows(), ...scrapeExportRows()];
  const payload = {
    generatedAt: new Date().toISOString(),
    summary: catalogSummary(),
    count: rows.length,
    scholarships: rows,
  };

  const output = format === "md" ? toMarkdown(rows) : JSON.stringify(payload, null, 2);

  if (outPath) {
    const abs = path.isAbsolute(outPath) ? outPath : path.join(process.cwd(), outPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, output, "utf8");
    // eslint-disable-next-line no-console
    console.log(`Wrote ${rows.length} scholarships to ${abs}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(output);
  }
}

main();
