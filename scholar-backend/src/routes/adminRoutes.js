// src/routes/adminRoutes.js
const express = require('express');
const { Pool } = require('pg');
const { discoverScholarships } = require('../services/discoveryService');

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET /admin/candidates
router.get('/candidates', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM scholarship_candidates ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// PATCH /admin/candidates/:id/approve
router.patch('/candidates/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const candidateResult = await pool.query(
      'SELECT * FROM scholarship_candidates WHERE id = $1',
      [id]
    );
    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const candidate = candidateResult.rows[0];
    const extracted = candidate.extracted_data || {};

    const title = extracted.title || candidate.url;
    const description = extracted.description || candidate.raw_text?.slice(0, 1500) || '';
    const field = extracted.field_of_study || extracted.field || null;
    const location = extracted.country || null;
    const funding = extracted.funding_type || null;
    const deadline = extracted.deadline || null;
    const requirements = extracted.requirements || [];

    await pool.query(
      `INSERT INTO scholarships
        (title, field, location, funding, deadline, requirements, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [title, field, location, funding, deadline, requirements, description]
    );

    await pool.query(
      'UPDATE scholarship_candidates SET status = $1 WHERE id = $2',
      ['approved', id]
    );

    res.json({ message: 'Candidate approved and scholarship created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve candidate' });
  }
});

// PATCH /admin/candidates/:id/reject
router.patch('/candidates/:id/reject', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE scholarship_candidates SET status = $1 WHERE id = $2',
      ['rejected', id]
    );
    res.json({ message: 'Candidate rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject candidate' });
  }
});

// POST /admin/discover - manual trigger for discovery
router.post('/discover', async (req, res) => {
  const urls = req.body.urls || [];
  const feeds = req.body.feeds || [];
  if (!Array.isArray(urls) || !Array.isArray(feeds)) {
    return res.status(400).json({ error: 'URLs and feeds must be arrays' });
  }

  try {
    const count = await discoverScholarships({ urls, feeds }, pool);
    res.json({ message: `Discovered ${count} scholarships` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Discovery failed' });
  }
});

// GET /admin/analytics - comprehensive analytics data
router.get('/analytics', async (req, res) => {
  try {
    // Basic counts
    const [scholarshipsResult, candidatesResult, recommendationsResult] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'verified') as approved,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM scholarships
      `),
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM scholarship_candidates
      `),
      pool.query('SELECT COUNT(*) as total FROM user_activity WHERE description LIKE \'%recommendation%\'')
    ]);

    // Top countries from scholarships
    const topCountriesResult = await pool.query(`
      SELECT country, COUNT(*) as count
      FROM scholarships
      WHERE country IS NOT NULL AND status = 'verified'
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `);

    // Top fields of study from scholarships
    const topFieldsResult = await pool.query(`
      SELECT field_of_study, COUNT(*) as count
      FROM scholarships
      WHERE field_of_study IS NOT NULL AND status = 'verified'
      GROUP BY field_of_study
      ORDER BY count DESC
      LIMIT 10
    `);

    // Discovered scholarships over time (last 30 days)
    const discoveryOverTimeResult = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM scholarship_candidates
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Recent activity
    const [recentApproved, recentCandidates] = await Promise.all([
      pool.query(`
        SELECT id, title, country, field_of_study, created_at
        FROM scholarships
        WHERE status = 'verified'
        ORDER BY created_at DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT id, url, extracted_data->>'title' as title, created_at
        FROM scholarship_candidates
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 5
      `)
    ]);

    const scholarships = scholarshipsResult.rows[0];
    const candidates = candidatesResult.rows[0];
    const recommendations = recommendationsResult.rows[0];

    // Calculate approval rate
    const totalCandidates = parseInt(candidates.total);
    const approvedCandidates = parseInt(candidates.approved);
    const approvalRate = totalCandidates > 0 ? (approvedCandidates / totalCandidates) * 100 : 0;

    res.json({
      totals: {
        scholarships: parseInt(scholarships.total),
        candidates: totalCandidates,
        approved: approvedCandidates,
        rejected: parseInt(candidates.rejected),
        pending: parseInt(candidates.pending),
        recommendations: parseInt(recommendations.total)
      },
      approvalRate: Math.round(approvalRate * 100) / 100,
      topCountries: topCountriesResult.rows,
      topFields: topFieldsResult.rows,
      discoveryOverTime: discoveryOverTimeResult.rows,
      recentActivity: {
        approvedScholarships: recentApproved.rows,
        discoveredCandidates: recentCandidates.rows
      }
    });
  } catch (err) {
    console.error('Analytics query failed:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
