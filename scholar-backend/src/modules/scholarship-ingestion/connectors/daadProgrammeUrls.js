/**
 * Stable DAAD programme pages on the official scholarship database (www2.daad.de).
 * Legacy www.daad.de /daad-scholarships/* paths often 404 after site migrations.
 */
const DAAD_STIPDB_BASE =
  "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database";

function daadStipDetail(detailId) {
  return `${DAAD_STIPDB_BASE}/?detail=${detailId}`;
}

/** @type {Record<string, string>} externalId → official programme page */
const DAAD_PROGRAMME_URL_BY_EXTERNAL_ID = {
  "daad-in-region": daadStipDetail(10000486),
  "daad-epos": daadStipDetail(50076777),
  "daad-research-grants": daadStipDetail(57742121),
  "daad-study-scholarships": daadStipDetail(50026200),
  "daad-study-stipends": daadStipDetail(50035295),
  "daad-graduate-schools": daadStipDetail(57135739),
  "daad-undergraduate": daadStipDetail(10000207),
};

const DAAD_SCHOLARSHIP_DATABASE_HUB = "https://www.daad.de/stipdb-redirect/";

module.exports = {
  DAAD_STIPDB_BASE,
  DAAD_SCHOLARSHIP_DATABASE_HUB,
  daadStipDetail,
  DAAD_PROGRAMME_URL_BY_EXTERNAL_ID,
};
