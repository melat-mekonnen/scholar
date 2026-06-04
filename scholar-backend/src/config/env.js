const path = require("path");
const dotenv = require("dotenv");

// Repo root first (e.g. Supabase), then scholar-backend/.env for local overrides.
const repoRootEnv = path.join(__dirname, "../../../.env");
const backendEnv = path.join(__dirname, "../../.env");
dotenv.config({ path: repoRootEnv });
dotenv.config({ path: backendEnv });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value == null || value === "" ? fallback : value;
}

function optionalBool(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  frontendAppUrl: required("FRONTEND_APP_URL"),
  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: required("GOOGLE_REDIRECT_URI"),
  aiServiceUrl: optional("AI_SERVICE_URL", "http://127.0.0.1:8010"),
  scholarMlChatUrl: optional("SCHOLAR_ML_CHAT_URL", ""),
  smtpHost: optional("SMTP_HOST", ""),
  smtpPort: parseInt(optional("SMTP_PORT", "587"), 10),
  smtpUser: optional("SMTP_USER", ""),
  smtpPass: optional("SMTP_PASS", ""),
  smtpFrom: optional("SMTP_FROM", ""),
  ingestionEnabled: optionalBool("INGESTION_ENABLED", false),
  ingestDaadEnabled: optionalBool("INGEST_DAAD_ENABLED", false),
  ingestErasmusEnabled: optionalBool("INGEST_ERASMUS_ENABLED", false),
  ingestFulbrightEnabled: optionalBool("INGEST_FULBRIGHT_ENABLED", false),
  ingestCheveningEnabled: optionalBool("INGEST_CHEVENING_ENABLED", false),
  ingestCommonwealthEnabled: optionalBool("INGEST_COMMONWEALTH_ENABLED", false),
  ingestFastwebEnabled: optionalBool("INGEST_FASTWEB_ENABLED", false),
  ingestAustraliaAwardsEnabled: optionalBool("INGEST_AUSTRALIA_AWARDS_ENABLED", false),
  ingestMastercardFoundationEnabled: optionalBool("INGEST_MASTERCARD_FOUNDATION_ENABLED", false),
  ingestAfricanMinistriesEnabled: optionalBool("INGEST_AFRICAN_MINISTRIES_ENABLED", false),
  ingestAfricanUniversitiesEnabled: optionalBool("INGEST_AFRICAN_UNIVERSITIES_ENABLED", false),
  ingestAfricanAggregatorsEnabled: optionalBool("INGEST_AFRICAN_AGGREGATORS_ENABLED", false),
  ingestAfricanResearchEnabled: optionalBool("INGEST_AFRICAN_RESEARCH_ENABLED", false),
  /** staging = capture all rows then publish; direct = legacy immediate upsert */
  ingestPipelineMode: optional("INGEST_PIPELINE_MODE", "staging").toLowerCase(),
  /** merge = enrich existing rows instead of skipping duplicates */
  ingestDedupMode: optional("INGEST_DEDUP_MODE", "merge").toLowerCase(),
  chatFreeDailyLimit: Math.max(
    1,
    parseInt(optional("CHAT_FREE_DAILY_LIMIT", "10"), 10) || 10
  ),
  chatQuotaBypassRoles: optional("CHAT_QUOTA_BYPASS_ROLES", "admin,owner")
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean),
  stripeSecretKey: optional("STRIPE_SECRET_KEY", ""),
  stripeWebhookSecret: optional("STRIPE_WEBHOOK_SECRET", ""),
  stripePriceIdProMonthly: optional("STRIPE_PRICE_ID_PRO_MONTHLY", ""),
  stripeSuccessUrl:
    optional("STRIPE_SUCCESS_URL", "") ||
    `${optional("FRONTEND_APP_URL", "http://localhost:3000")}/settings/subscription?billing=success`,
  stripeCancelUrl:
    optional("STRIPE_CANCEL_URL", "") ||
    `${optional("FRONTEND_APP_URL", "http://localhost:3000")}/settings/subscription?billing=cancel`,
  chapaSecretKey: optional("CHAPA_SECRET_KEY", ""),
  chapaProAmountEtb: optional("CHAPA_PRO_AMOUNT_ETB", "149"),
  chapaProDays: Math.max(1, parseInt(optional("CHAPA_PRO_DAYS", "30"), 10) || 30),
  chapaCallbackUrl:
    optional("CHAPA_CALLBACK_URL", "") ||
    `http://127.0.0.1:${parseInt(optional("PORT", "4000"), 10)}/api/billing/webhooks/chapa`,
  chapaReturnUrl:
    optional("CHAPA_RETURN_URL", "") ||
    `${optional("FRONTEND_APP_URL", "http://localhost:3000")}/settings/subscription?billing=success`,
  chapaFallbackEmail: optional("CHAPA_FALLBACK_EMAIL", ""),
  openRouterApiKey: optional("OPENROUTER_API_KEY", ""),
  openRouterModel: optional("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
  aiDescriptionRefineEnabled: optionalBool("AI_DESCRIPTION_REFINE_ENABLED", false),
  aiTranslationEnabled: optionalBool("AI_TRANSLATION_ENABLED", false),
};

module.exports = { env };
