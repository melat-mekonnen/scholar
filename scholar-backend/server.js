require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const cron = require('node-cron');
const adminRoutes = require('./src/routes/adminRoutes');
const { discoverScholarships } = require('./src/services/discoveryService');

const app = express();
const port = process.env.PORT || 4000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(express.json());

// Admin routes
app.use('/admin', adminRoutes);

// POST /scholarships - insert a new scholarship
app.post('/scholarships', async (req, res) => {
  const { title, field, location, funding, deadline, requirements, description } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO scholarships (title, field, location, funding, deadline, requirements, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, field, location, funding, deadline, requirements, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to insert scholarship' });
  }
});

// GET /scholarships - fetch all scholarships
app.get('/scholarships', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM scholarships ORDER BY created_at DESC NULLS LAST, id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch scholarships' });
  }
});

// POST /recommend - get recommendation from ML service
app.post('/recommend', async (req, res) => {
  const { student, scholarship } = req.body;
  if (!student || !scholarship) {
    return res.status(400).json({ error: 'Student and scholarship data required' });
  }
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8010';
    const response = await axios.post(`${aiServiceUrl}/recommend`, { student, scholarship });
    res.json(response.data);
  } catch (err) {
    console.error('Error calling ML service:', err.message);
    res.status(500).json({ error: 'Failed to get recommendation' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Cron job for discovery (every 6 hours)
if (process.env.DISCOVERY_CRON_ENABLED === 'true') {
  const cronExpression = process.env.DISCOVERY_CRON_EXPRESSION || '0 */6 * * *';
  cron.schedule(cronExpression, async () => {
    console.log('Running scheduled discovery...');
    // Hardcoded list of URLs for now (can be from config or DB later)
    const urls = [
      'https://www.harvard.edu/scholarships',
      'https://www.stanford.edu/scholarships',
      // Add more public URLs
    ];
    try {
      const count = await discoverScholarships(urls, pool);
      console.log(`Scheduled discovery completed: ${count} scholarships found`);
    } catch (error) {
      console.error('Scheduled discovery failed:', error);
    }
  });
  console.log(`Discovery cron enabled: ${cronExpression}`);
}
