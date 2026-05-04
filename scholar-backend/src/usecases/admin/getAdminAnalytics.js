const { query } = require("../../infra/db/neonClient");

async function getAdminAnalytics() {
  // Get scholarship totals
  const scholarshipsTotalResult = await query(
    "SELECT COUNT(*) AS total FROM scholarships",
    []
  );
  const scholarshipsVerifiedResult = await query(
    "SELECT COUNT(*) AS count FROM scholarships WHERE status = 'verified'",
    []
  );
  const scholarshipsPendingResult = await query(
    "SELECT COUNT(*) AS count FROM scholarships WHERE status = 'pending'",
    []
  );

  // Get candidate totals (may not exist if migration not run)
  let candidatesTotal = 0;
  let candidatesApproved = 0;
  let candidatesRejected = 0;
  let candidatesPending = 0;
  try {
    const candidatesTotalResult = await query(
      "SELECT COUNT(*) AS total FROM scholarship_candidates",
      []
    );
    candidatesTotal = Number(candidatesTotalResult.rows[0]?.total || 0);

    const candidatesApprovedResult = await query(
      "SELECT COUNT(*) AS count FROM scholarship_candidates WHERE status = 'approved'",
      []
    );
    candidatesApproved = Number(candidatesApprovedResult.rows[0]?.count || 0);

    const candidatesRejectedResult = await query(
      "SELECT COUNT(*) AS count FROM scholarship_candidates WHERE status = 'rejected'",
      []
    );
    candidatesRejected = Number(candidatesRejectedResult.rows[0]?.count || 0);

    const candidatesPendingResult = await query(
      "SELECT COUNT(*) AS count FROM scholarship_candidates WHERE status = 'pending'",
      []
    );
    candidatesPending = Number(candidatesPendingResult.rows[0]?.count || 0);
  } catch (error) {
    // Table may not exist, set to 0
    console.log("scholarship_candidates table not found, setting candidate counts to 0");
  }

  // Get recommendations count (assuming there's a recommendations table or similar)
  // For now, set to 0 since table may not exist
  const recommendationsCount = 0;

  // Calculate approval rate for scholarships
  const totalProcessed = Number(scholarshipsVerifiedResult.rows[0]?.count || 0) +
                        Number(scholarshipsPendingResult.rows[0]?.count || 0);
  const approvalRate = totalProcessed > 0 ?
    Math.round((Number(scholarshipsVerifiedResult.rows[0]?.count || 0) / totalProcessed) * 100) : 0;

  // Get top countries
  const topCountriesResult = await query(
    "SELECT country, COUNT(*) as count FROM scholarships WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 5",
    []
  );

  // Get top fields of study
  const topFieldsResult = await query(
    "SELECT field_of_study, COUNT(*) as count FROM scholarships WHERE field_of_study IS NOT NULL GROUP BY field_of_study ORDER BY count DESC LIMIT 5",
    []
  );

  // Get discovery over time (last 30 days)
  const discoveryOverTimeResult = await query(
    "SELECT DATE(created_at) as date, COUNT(*) as count FROM scholarships WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date",
    []
  );

  // Get recent activity - approved scholarships
  let recentApprovedScholarships = [];
  try {
    const recentApprovedScholarshipsResult = await query(
      "SELECT id, title, country, field_of_study, created_at FROM scholarships WHERE status = 'verified' ORDER BY created_at DESC LIMIT 5",
      []
    );
    recentApprovedScholarships = recentApprovedScholarshipsResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      country: row.country,
      field_of_study: row.field_of_study,
      created_at: row.created_at.toISOString()
    }));
  } catch (error) {
    console.log("Error fetching recent approved scholarships:", error.message);
  }

  // Get recent activity - discovered candidates
  let recentDiscoveredCandidates = [];
  try {
    const recentDiscoveredCandidatesResult = await query(
      "SELECT id, url, title, created_at FROM scholarship_candidates ORDER BY created_at DESC LIMIT 5",
      []
    );
    recentDiscoveredCandidates = recentDiscoveredCandidatesResult.rows.map(row => ({
      id: row.id,
      url: row.url,
      title: row.title,
      created_at: row.created_at.toISOString()
    }));
  } catch (error) {
    console.log("Error fetching recent discovered candidates:", error.message);
  }

  return {
    totals: {
      scholarships: Number(scholarshipsTotalResult.rows[0]?.total || 0),
      candidates: candidatesTotal,
      approved: candidatesApproved,
      rejected: candidatesRejected,
      pending: candidatesPending,
      recommendations: recommendationsCount,
    },
    approvalRate,
    topCountries: topCountriesResult.rows.map(row => ({
      country: row.country,
      count: Number(row.count)
    })),
    topFields: topFieldsResult.rows.map(row => ({
      field_of_study: row.field_of_study,
      count: Number(row.count)
    })),
    discoveryOverTime: discoveryOverTimeResult.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      count: Number(row.count)
    })),
    recentActivity: {
      approvedScholarships: recentApprovedScholarships,
      discoveredCandidates: recentDiscoveredCandidates
    }
  };
}

module.exports = { getAdminAnalytics };