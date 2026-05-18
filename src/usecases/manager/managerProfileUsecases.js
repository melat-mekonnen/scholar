const { ManagerProfileRepository } = require("../../repositories/ManagerProfileRepository");

const repo = new ManagerProfileRepository();

const MAX_TITLE = 200;
const MAX_ORG = 200;
const MAX_BIO = 4000;
const MAX_PHONE = 40;
const MAX_URL = 500;

function optionalTrim(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function assertLen(field, value, max) {
  if (value != null && value.length > max) {
    const err = new Error(`${field} is too long (max ${max} characters)`);
    err.statusCode = 400;
    throw err;
  }
}

function assertEmail(v) {
  if (v == null) return null;
  const s = optionalTrim(v);
  if (!s) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    const err = new Error("Invalid public contact email");
    err.statusCode = 400;
    throw err;
  }
  return s.toLowerCase();
}

function assertUrl(v) {
  if (v == null) return null;
  const s = optionalTrim(v);
  if (!s) return null;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (!["http:", "https:"].includes(u.protocol)) {
      throw new Error();
    }
    return u.toString();
  } catch {
    const err = new Error("Invalid website URL");
    err.statusCode = 400;
    throw err;
  }
}

function formatRow(row) {
  if (!row) {
    return {
      jobTitle: null,
      organizationName: null,
      bio: null,
      publicContactEmail: null,
      websiteUrl: null,
      phone: null,
      createdAt: null,
      updatedAt: null,
    };
  }
  return {
    id: row.id,
    jobTitle: row.job_title,
    organizationName: row.organization_name,
    bio: row.bio,
    publicContactEmail: row.public_contact_email,
    websiteUrl: row.website_url,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getManagerProfile(userId) {
  const row = await repo.findByUserId(userId);
  return formatRow(row);
}

async function upsertManagerProfile(userId, body = {}) {
  const jobTitle = optionalTrim(body.jobTitle);
  const organizationName = optionalTrim(body.organizationName);
  const bio = optionalTrim(body.bio);
  const phone = optionalTrim(body.phone);

  assertLen("Job title", jobTitle, MAX_TITLE);
  assertLen("Organization name", organizationName, MAX_ORG);
  assertLen("Bio", bio, MAX_BIO);
  assertLen("Phone", phone, MAX_PHONE);

  const publicContactEmail = assertEmail(body.publicContactEmail);
  let websiteUrl = null;
  if (body.websiteUrl != null && String(body.websiteUrl).trim() !== "") {
    websiteUrl = assertUrl(body.websiteUrl);
    assertLen("Website URL", websiteUrl, MAX_URL);
  }

  const row = await repo.upsert(userId, {
    jobTitle,
    organizationName,
    bio,
    publicContactEmail,
    websiteUrl,
    phone,
  });
  return formatRow(row);
}

module.exports = {
  getManagerProfile,
  upsertManagerProfile,
};
