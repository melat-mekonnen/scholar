const axios = require("axios");
const { env } = require("../../../config/env");

const CHAPA_BASE = "https://api.chapa.co/v1";

function isChapaConfigured() {
  return Boolean(env.chapaSecretKey);
}

function chapaHeaders() {
  return {
    Authorization: `Bearer ${env.chapaSecretKey}`,
    "Content-Type": "application/json",
  };
}

function formatChapaError(error) {
  if (!axios.isAxiosError(error)) {
    return error;
  }
  const data = error.response?.data;
  const msg = data?.message;
  let detail = "";
  if (typeof msg === "string") {
    detail = msg;
  } else if (msg && typeof msg === "object") {
    detail = Object.entries(msg)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("; ");
  } else if (data?.status) {
    detail = String(data.status);
  }
  const err = new Error(detail ? `Chapa error: ${detail}` : `Chapa request failed (${error.response?.status})`);
  err.statusCode = error.response?.status && error.response.status < 500 ? error.response.status : 502;
  err.chapaResponse = data;
  return err;
}

async function chapaPost(path, body) {
  try {
    const { data } = await axios.post(`${CHAPA_BASE}${path}`, body, {
      headers: chapaHeaders(),
      timeout: 30000,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    return data;
  } catch (error) {
    throw formatChapaError(error);
  }
}

async function chapaGet(path) {
  try {
    const { data } = await axios.get(`${CHAPA_BASE}${path}`, {
      headers: chapaHeaders(),
      timeout: 30000,
      validateStatus: (s) => s >= 200 && s < 300,
    });
    return data;
  } catch (error) {
    throw formatChapaError(error);
  }
}

function isPublicCallbackUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!["https:", "http:"].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Chapa allows only letters, numbers, hyphens, underscores, spaces, and dots. */
function sanitizeChapaText(text, fallback, maxLen = 100) {
  const cleaned = String(text || "")
    .replace(/[^a-zA-Z0-9\s\-_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
  return cleaned || fallback;
}

function isChapaAcceptableEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)) {
    return false;
  }
  const domain = e.split("@")[1];
  if (
    domain === "localhost" ||
    domain.endsWith(".local") ||
    domain.endsWith(".test") ||
    domain.endsWith(".invalid")
  ) {
    return false;
  }
  return true;
}

/**
 * Email for Chapa initialize. Returns null to omit the field (Chapa allows that;
 * the payer can enter email on the checkout page). Fake domains like example.com
 * are rejected with validation.email.
 */
function resolveChapaEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (isChapaAcceptableEmail(e)) {
    return e;
  }
  const fallback = String(env.chapaFallbackEmail || "").trim().toLowerCase();
  if (fallback && isChapaAcceptableEmail(fallback)) {
    return fallback;
  }
  return null;
}

function formatChapaAmount(amountEtb) {
  const n = Number(amountEtb);
  if (!Number.isFinite(n) || n <= 0) {
    return "149.00";
  }
  return n.toFixed(2);
}

module.exports = {
  isChapaConfigured,
  chapaPost,
  chapaGet,
  isPublicCallbackUrl,
  sanitizeChapaText,
  resolveChapaEmail,
  formatChapaAmount,
};
