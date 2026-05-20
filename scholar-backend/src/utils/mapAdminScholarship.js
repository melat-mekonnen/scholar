function mapAdminScholarship(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    organizationName: row.organization_name,
    country: row.country,
    degreeLevel: row.degree_level,
    fieldOfStudy: row.field_of_study,
    fundingType: row.funding_type,
    deadline: row.deadline,
    amount: row.amount,
    description: row.description,
    applicationUrl: row.application_url,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    hostCountry: row.host_country,
    qualityScore: row.quality_score,
    isRolling: Boolean(row.is_rolling),
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    postedBy: row.posted_by_id
      ? {
          id: row.posted_by_id,
          fullName: row.posted_by_full_name,
          email: row.posted_by_email,
        }
      : null,
  };
}

module.exports = { mapAdminScholarship };
