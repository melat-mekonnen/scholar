function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_err) {
    return false;
  }
}

function validateScholarshipRecord(record) {
  const errors = [];

  if (!record.title) errors.push("title is required");
  if (!record.country) errors.push("country is required");
  if (!record.sourceName) errors.push("sourceName is required");
  if (!record.applicationUrl) errors.push("applicationUrl is required");
  if (record.applicationUrl && !isValidUrl(record.applicationUrl)) {
    errors.push("applicationUrl must be a valid URL");
  }
  if (record.sourceUrl && !isValidUrl(record.sourceUrl)) {
    errors.push("sourceUrl must be a valid URL");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = { validateScholarshipRecord };
