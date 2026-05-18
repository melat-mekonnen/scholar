const { OpenAI } = require("openai");
const { env } = require("../config/env");

const openai = env.openAiApiKey
  ? new OpenAI({ apiKey: env.openAiApiKey })
  : null;

const queryEmbeddingCache = new Map();

function normalizeText(text) {
  if (!text) return "";
  return String(text)
    .replace(/\s+/g, " ")
    .trim();
}

function buildScholarshipEmbeddingText(scholarship) {
  const parts = [];
  if (scholarship.title) parts.push(scholarship.title);
  if (scholarship.description) parts.push(scholarship.description);
  if (scholarship.funding_type) parts.push(scholarship.funding_type);
  if (scholarship.country) parts.push(scholarship.country);
  if (scholarship.degree_level) parts.push(scholarship.degree_level);
  if (scholarship.field_of_study) parts.push(scholarship.field_of_study);
  if (scholarship.organization_name) parts.push(scholarship.organization_name);
  return normalizeText(parts.join(" · "));
}

function cacheKey(text) {
  return normalizeText(text).toLowerCase();
}

async function getTextEmbedding(text) {
  if (!text || !text.trim()) {
    throw new Error("Text is required to generate an embedding.");
  }

  const key = cacheKey(text);
  if (queryEmbeddingCache.has(key)) {
    return queryEmbeddingCache.get(key);
  }

  if (!openai) {
    // For local development without an API key, return a mock 1536-dim vector
    // This allows the SQL vector search architecture to be tested.
    console.warn("OpenAI API key missing. Using mock embedding for semantic search.");
    const mockEmbedding = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    
    // Normalize to unit vector
    const length = Math.sqrt(mockEmbedding.reduce((sum, val) => sum + val * val, 0));
    const normalized = mockEmbedding.map(val => val / length);
    
    queryEmbeddingCache.set(key, normalized);
    return normalized;
  }

  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 5000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      }, { signal: controller.signal });

      clearTimeout(timeoutId);

      const embedding = response.data[0].embedding;
      
      // Keep cache small to prevent memory leaks
      if (queryEmbeddingCache.size > 1000) {
        const firstKey = queryEmbeddingCache.keys().next().value;
        queryEmbeddingCache.delete(firstKey);
      }
      
      queryEmbeddingCache.set(key, embedding);
      return embedding;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`[AI_TIMEOUT] OpenAI embedding generation timed out on attempt ${attempt}`);
      } else {
        console.warn(`[AI_API_FAILURE] OpenAI embedding generation failed on attempt ${attempt}:`, err.message);
      }
      
      if (attempt === MAX_RETRIES) {
        throw new Error(`OpenAI API failed after ${MAX_RETRIES} attempts: ${err.message}`);
      }
      
      // Wait before retry
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function batchScholarshipEmbeddings(scholarships = []) {
  if (!openai) {
    const output = [];
    console.warn("OpenAI API key missing. Using mock embeddings for batch.");
    scholarships.forEach(scholarship => {
      const mockEmbedding = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
      const length = Math.sqrt(mockEmbedding.reduce((sum, val) => sum + val * val, 0));
      const normalized = mockEmbedding.map(val => val / length);
      output.push({ scholarship, embedding: normalized });
    });
    return output;
  }

  const batchSize = 50;
  const output = [];

  for (let i = 0; i < scholarships.length; i += batchSize) {
    const batch = scholarships.slice(i, i + batchSize);
    const inputs = batch.map(buildScholarshipEmbeddingText);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: inputs,
    });

    const embeddings = response?.data?.map((item) => item.embedding);
    if (!Array.isArray(embeddings) || embeddings.length !== batch.length) {
      throw new Error("OpenAI batch embedding response invalid.");
    }

    batch.forEach((scholarship, index) => {
      const embedding = embeddings[index];
      if (Array.isArray(embedding)) {
        queryEmbeddingCache.set(cacheKey(inputs[index]), embedding);
        output.push({ scholarship, embedding });
      }
    });
  }

  return output;
}

function vectorLiteral(embedding) {
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding must be an array of numbers.");
  }
  return `[${embedding.map((value) => Number(value)).join(",")}]`;
}

module.exports = {
  buildScholarshipEmbeddingText,
  getTextEmbedding,
  batchScholarshipEmbeddings,
  vectorLiteral,
};
