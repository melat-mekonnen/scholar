/**
 * SQL fragments for scholarships shown to students (browse, bookmarks, AI pool).
 * Excludes past deadlines (unless rolling), closed application cycles, and past apply windows.
 */
function publicOpenScholarshipSql(alias = "s") {
  const p = alias ? `${alias}.` : "";
  return `(${p}deadline IS NULL OR ${p}deadline >= CURRENT_DATE OR ${p}is_rolling = TRUE)
    AND LOWER(COALESCE(${p}application_status, '')) <> 'closed'
    AND (${p}application_end_date IS NULL OR ${p}application_end_date >= CURRENT_DATE)`;
}

module.exports = { publicOpenScholarshipSql };
