/**
 * Phase 1 curated programmes — re-exports leaf catalog + scrape programmes.
 * Generic scheme-level Commonwealth/Chevening URLs removed in favour of leaf listings.
 */
const {
  PHASE1_SCRAPE_PROGRAMMES,
  PHASE1_CURATED_DESCRIPTIONS,
  leafProgrammeDefinitions,
  phase1ScrapeProgrammesWithDescriptions,
  catalogSummary,
} = require("../leafProgrammes/assembleLeafCatalog");

/** @deprecated Use leafProgrammeDefinitions + PHASE1_SCRAPE_PROGRAMMES */
const PHASE1_CURATED_PROGRAMMES = [
  ...leafProgrammeDefinitions(),
  ...PHASE1_SCRAPE_PROGRAMMES,
];

function phase1ProgrammesWithDescriptions() {
  return phase1ScrapeProgrammesWithDescriptions();
}

module.exports = {
  PHASE1_CURATED_PROGRAMMES,
  PHASE1_CURATED_DESCRIPTIONS,
  phase1ProgrammesWithDescriptions,
  catalogSummary,
};
