// src/services/discoveryService.js
const axios = require('axios');
const cheerio = require('cheerio');

const SCHOLARSHIP_KEYWORDS = ['scholarship', 'fellowship', 'grant', 'funded', 'financial aid', 'bursary'];
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8010';

async function fetchPageText(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScholarshipBot/1.0)',
      },
    });
    const $ = cheerio.load(response.data);
    $('script, style, nav, footer, aside').remove();
    return $.text().replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return null;
  }
}

async function fetchFeedLinks(feedUrl) {
  try {
    const response = await axios.get(feedUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScholarshipBot/1.0)',
      },
    });
    const $ = cheerio.load(response.data, { xmlMode: true });
    const links = [];
    $('item link, entry link').each((_, element) => {
      const link = $(element).text().trim();
      if (link) {
        links.push(link);
      }
    });
    return links;
  } catch (error) {
    console.error(`Failed to fetch RSS feed ${feedUrl}:`, error.message);
    return [];
  }
}

function isScholarshipPage(text) {
  const lowerText = text.toLowerCase();
  return SCHOLARSHIP_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

async function extractStructuredData(text) {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/extract`, { text });
    return response.data;
  } catch (error) {
    console.error('NLP extraction failed:', error.message);
    return null;
  }
}

async function gatherUrls(sources) {
  const urls = new Set();

  if (Array.isArray(sources)) {
    sources.forEach((url) => urls.add(url));
  } else {
    (sources.urls || []).forEach((url) => urls.add(url));
    for (const feedUrl of sources.feeds || []) {
      const feedLinks = await fetchFeedLinks(feedUrl);
      feedLinks.forEach((link) => urls.add(link));
    }
  }

  return Array.from(urls);
}

async function discoverScholarships(sources, pool) {
  const urls = await gatherUrls(sources);
  const candidates = [];

  for (const url of urls) {
    const existing = await pool.query('SELECT id FROM scholarship_candidates WHERE url = $1', [url]);
    if (existing.rows.length > 0) {
      console.log(`Skipping duplicate URL: ${url}`);
      continue;
    }

    const rawText = await fetchPageText(url);
    if (!rawText) continue;
    if (!isScholarshipPage(rawText)) {
      continue;
    }

    const extractedData = await extractStructuredData(rawText);
    candidates.push({ url, rawText, extractedData });
  }

  for (const candidate of candidates) {
    try {
      await pool.query(
        'INSERT INTO scholarship_candidates (url, raw_text, extracted_data) VALUES ($1, $2, $3)',
        [candidate.url, candidate.rawText, candidate.extractedData]
      );
      console.log(`Discovered scholarship candidate: ${candidate.url}`);
    } catch (error) {
      console.error(`Failed to insert candidate ${candidate.url}:`, error.message);
    }
  }

  return candidates.length;
}

module.exports = { discoverScholarships };
