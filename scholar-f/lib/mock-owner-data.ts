export const mockOwnerData = {
  totals: {
    scholarships: 12450,
    pendingApprovals: 342,
    verifiedSources: 128,
    suspiciousSources: 14,
    activeUniversityPartners: 45,
    discoverySuccessRate: 94.2,
    recommendations: 85200,
    sponsoredListings: 24,
    recentAIActivityCount: 1250,
  },
  revenue: {
    estimatedMonthly: 12450,
    impressions: 1205000,
    clicks: 45000,
  },
  aiConfidenceScores: [
    { source: "university_of_example.edu", score: 98, status: "verified" },
    { source: "sketchy-scholarships-hub.com", score: 45, status: "flagged" },
    { source: "global-edu-grants.org", score: 88, status: "verified" },
    { source: "fake-grants-now.net", score: 12, status: "blocked" },
  ],
  pipelineActivity: [
    { date: "2026-05-01", discovered: 120, duplicates: 45, failed: 2 },
    { date: "2026-05-02", discovered: 145, duplicates: 50, failed: 1 },
    { date: "2026-05-03", discovered: 98, duplicates: 30, failed: 5 },
  ],
  universityPartners: [
    { id: "1", name: "Addis Ababa University", status: "active", campaigns: 2, submissions: 140 },
    { id: "2", name: "Hawassa University", status: "active", campaigns: 1, submissions: 85 },
    { id: "3", name: "Jimma University", status: "pending", campaigns: 0, submissions: 0 },
  ],
  analyticsTrends: {
    applications: [
      { date: "2026-04-28", count: 1200 },
      { date: "2026-04-29", count: 1350 },
      { date: "2026-04-30", count: 1400 },
      { date: "2026-05-01", count: 1100 },
      { date: "2026-05-02", count: 1600 },
      { date: "2026-05-03", count: 1800 },
    ],
  },
  systemLogs: [
    { id: "1", action: "AI Auto-Rejected Source", user: "System", timestamp: "2026-05-03T10:23:00Z", details: "Blocked sketchy-scholarships.com" },
    { id: "2", action: "Approved Scholarship", user: "owner@ethioscholar.com", timestamp: "2026-05-03T09:15:00Z", details: "ID: 10452" },
    { id: "3", action: "Updated Monetization Settings", user: "owner@ethioscholar.com", timestamp: "2026-05-02T16:45:00Z", details: "Increased boost cost by 5%" },
  ]
};
