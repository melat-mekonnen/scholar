const { env } = require("../config/env");
const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");
const { StudyProgrammeRepository } = require("../repositories/StudyProgrammeRepository");
const {
  translateToAmharic,
  translateMetadataToAmharic,
} = require("../modules/scholarship-ingestion/ai/translateScholarshipContent");

const scholarshipRepo = new ScholarshipRepository();
const programmeRepo = new StudyProgrammeRepository();

function isTranslationEnabled() {
  if (env.aiTranslationEnabled) return true;
  return env.aiTranslationGoogleFallback;
}

function hasText(value) {
  return Boolean(value && String(value).trim());
}

function needsMetadataTranslation(row, force = false) {
  if (force) return true;
  if (hasText(row.organization_name) && !hasText(row.organization_name_am)) return true;
  if (hasText(row.country) && !hasText(row.country_am)) return true;
  if (hasText(row.field_of_study) && !hasText(row.field_of_study_am)) return true;
  if (
    hasText(row.host_country) &&
    String(row.host_country).trim() !== String(row.country || "").trim() &&
    !hasText(row.host_country_am)
  ) {
    return true;
  }
  return false;
}

async function ensureRowAmharicContent(row, updateFields, { force = false } = {}) {
  const hasTitleAm = hasText(row.title_am);
  const hasDescriptionAm = hasText(row.description_am);
  const needsContent = force || !hasTitleAm || !hasDescriptionAm;
  const needsMeta = needsMetadataTranslation(row, force);

  if (!needsContent && !needsMeta) {
    return { skipped: true, reason: "already_translated" };
  }

  const descriptionEn = String(row.description || "").trim();
  if (needsContent && !descriptionEn) {
    return { skipped: true, reason: "missing_description" };
  }

  let titleAm = row.title_am || null;
  let descriptionAm = row.description_am || null;
  let organizationNameAm = row.organization_name_am || null;
  let countryAm = row.country_am || null;
  let fieldOfStudyAm = row.field_of_study_am || null;
  let hostCountryAm = row.host_country_am || null;
  let source = "existing";

  if (needsContent) {
    const translation = await translateToAmharic({
      title: row.title,
      description: descriptionEn,
    });

    if (!translation.titleAm && !translation.descriptionAm) {
      return {
        skipped: true,
        reason: "translate_failed",
        source: translation.source,
        error: translation.error || null,
      };
    }

    titleAm = translation.titleAm || titleAm;
    descriptionAm = translation.descriptionAm || descriptionAm;
    source = translation.source;
  }

  if (needsMeta) {
    const metadata = await translateMetadataToAmharic({
      organizationName: row.organization_name,
      country: row.country,
      fieldOfStudy: row.field_of_study,
      hostCountry: row.host_country,
    });

    organizationNameAm = metadata.organizationNameAm || organizationNameAm;
    countryAm = metadata.countryAm || countryAm;
    fieldOfStudyAm = metadata.fieldOfStudyAm || fieldOfStudyAm;
    hostCountryAm = metadata.hostCountryAm || hostCountryAm;
    if (metadata.source !== "empty") {
      source = metadata.source;
    }
  }

  await updateFields(row.id, {
    titleAm,
    descriptionAm,
    organizationNameAm,
    countryAm,
    fieldOfStudyAm,
    hostCountryAm,
  });

  return {
    id: row.id,
    title: row.title,
    source,
    translated: true,
  };
}

async function ensureScholarshipAmharicContent(scholarshipId, { force = false } = {}) {
  if (!scholarshipId || !isTranslationEnabled()) {
    return { skipped: true, reason: "translation_disabled" };
  }

  const row = await scholarshipRepo.findContentForTranslation(scholarshipId);
  if (!row) {
    return { skipped: true, reason: "not_found" };
  }

  return ensureRowAmharicContent(row, (id, fields) => scholarshipRepo.updateContentFields(id, fields), {
    force,
  });
}

async function ensureStudyProgrammeAmharicContent(programmeId, { force = false } = {}) {
  if (!programmeId || !isTranslationEnabled()) {
    return { skipped: true, reason: "translation_disabled" };
  }

  const row = await programmeRepo.findContentForTranslation(programmeId);
  if (!row) {
    return { skipped: true, reason: "not_found" };
  }

  return ensureRowAmharicContent(row, (id, fields) => programmeRepo.updateContentFields(id, fields), {
    force,
  });
}

async function maybeTranslateScholarship(scholarshipId, { awaitResult = false, force = false } = {}) {
  if (!scholarshipId || !isTranslationEnabled()) return null;

  const work = ensureScholarshipAmharicContent(scholarshipId, { force }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`[amharic] translation failed for ${scholarshipId}:`, err.message);
    return null;
  });

  if (awaitResult) {
    return work;
  }

  void work;
  return null;
}

async function maybeTranslateStudyProgramme(programmeId, { awaitResult = false, force = false } = {}) {
  if (!programmeId || !isTranslationEnabled()) return null;

  const work = ensureStudyProgrammeAmharicContent(programmeId, { force }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`[amharic] programme translation failed for ${programmeId}:`, err.message);
    return null;
  });

  if (awaitResult) {
    return work;
  }

  void work;
  return null;
}

module.exports = {
  ensureScholarshipAmharicContent,
  ensureStudyProgrammeAmharicContent,
  maybeTranslateScholarship,
  maybeTranslateStudyProgramme,
  isTranslationEnabled,
};
