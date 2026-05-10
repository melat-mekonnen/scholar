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
    throw new Error("OpenAI API key is not configured.");
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  const embedding = response?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("OpenAI embedding response invalid.");
  }

  queryEmbeddingCache.set(key, embedding);
  return embedding;
}

async function batchScholarshipEmbeddings(scholarships = []) {
  if (!openai) {
    throw new Error("OpenAI API key is not configured.");
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
