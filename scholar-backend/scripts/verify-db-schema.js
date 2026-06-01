/**
 * Milestone 2: read-only Supabase / Postgres schema audit.
 * Optionally applies idempotent migrate:* scripts for missing objects (--apply).
 *
 * Usage:
 *   node scripts/verify-db-schema.js
 *   node scripts/verify-db-schema.js --apply
 */
const path = require("path");
const { execSync } = require("child_process");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { pool, query } = require("../src/infra/db/neonClient");

const apply = process.argv.includes("--apply");

/** @type {{ id: string, label: string, npm: string, tables: string[], columns?: { table: string, column: string }[], feature: 'core' | 'optional' }[]} */
const MIGRATION_STEPS = [
  {
    id: "core",
    label: "Base schema (db/schema.sql or pg_restore)",
    npm: "",
    tables: [
      "users",
      "scholarships",
      "student_profiles",
      "applications",
      "bookmarks",
      "documents",
      "password_reset_tokens",
    ],
    feature: "core",
  },
  {
    id: "phases",
    label: "Study programmes / phases",
    npm: "migrate:phases",
    tables: ["study_programmes", "programme_scholarships"],
    feature: "core",
  },
  {
    id: "subscription",
    label: "Subscriptions & chat quota",
    npm: "migrate:subscription",
    tables: ["ai_chat_usage", "subscription_payments", "subscription_checkout_sessions"],
    feature: "core",
  },
  {
    id: "community",
    label: "Community",
    npm: "migrate:community",
    tables: [
      "community_channels",
      "community_messages",
      "community_message_attachments",
      "community_reports",
    ],
    columns: [{ table: "community_messages", column: "edited_at" }],
    feature: "core",
  },
  {
    id: "student-notifications",
    label: "Email reminders & apply follow-up",
    npm: "migrate:student-notifications",
    tables: [
      "student_notification_preferences",
      "scholarship_reminder_sent",
      "application_confirm_tokens",
    ],
    columns: [{ table: "applications", column: "follow_up_sent_at" }],
    feature: "core",
  },
  {
    id: "applications-m8",
    label: "Application notes (milestone 8)",
    npm: "migrate:applications-m8",
    tables: ["application_notes"],
    feature: "core",
  },
  {
    id: "manager-profiles",
    label: "Manager posting profiles",
    npm: "migrate:manager-profiles",
    tables: ["manager_profiles"],
    feature: "core",
  },
  {
    id: "admin-audit",
    label: "Admin audit logs",
    npm: "migrate:admin-audit-logs",
    tables: ["admin_audit_logs"],
    feature: "optional",
  },
  {
    id: "ingestion",
    label: "Ingestion pipeline tables",
    npm: "migrate:ingestion",
    tables: ["scholarship_import_runs", "scholarship_raw_imports", "scholarship_import_errors"],
    feature: "optional",
  },
  {
    id: "staging",
    label: "Scholarship staging",
    npm: "migrate:staging",
    tables: ["scholarship_staging"],
    feature: "optional",
  },
  {
    id: "catalog-signals",
    label: "Catalog signals & source registry",
    npm: "migrate:catalog-signals",
    tables: ["ingestion_sources", "ingestion_source_candidates"],
    columns: [{ table: "scholarships", column: "deadline_raw_text" }],
    feature: "optional",
  },
  {
    id: "scholarship-moderation",
    label: "Scholarship flags / notifications",
    npm: "migrate:scholarship-moderation",
    tables: ["scholarship_flags", "scholarship_notifications"],
    feature: "optional",
  },
];

const COUNT_TABLES = [
  "users",
  "scholarships",
  "applications",
  "bookmarks",
  "community_messages",
  "community_channels",
];

async function tableExists(tableName) {
  const res = await query(`SELECT to_regclass($1::text) AS reg`, [`public.${tableName}`]);
  return Boolean(res.rows[0]?.reg);
}

async function columnExists(tableName, columnName) {
  const res = await query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1`,
    [tableName, columnName],
  );
  return res.rowCount > 0;
}

async function countTable(tableName) {
  if (!(await tableExists(tableName))) return null;
  const res = await query(`SELECT COUNT(*)::int AS c FROM ${quoteIdent(tableName)}`, []);
  return res.rows[0]?.c ?? 0;
}

function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Invalid table name: ${name}`);
  }
  return `"${name}"`;
}

async function assessStep(step) {
  const missingTables = [];
  for (const t of step.tables) {
    if (!(await tableExists(t))) missingTables.push(t);
  }
  const missingColumns = [];
  for (const col of step.columns || []) {
    if (await tableExists(col.table)) {
      if (!(await columnExists(col.table, col.column))) {
        missingColumns.push(`${col.table}.${col.column}`);
      }
    }
  }
  const needed = missingTables.length > 0 || missingColumns.length > 0;
  return { missingTables, missingColumns, needed };
}

function runNpmScript(scriptName) {
  // eslint-disable-next-line no-console
  console.log(`\n→ Running npm run ${scriptName} ...`);
  execSync(`npm run ${scriptName}`, {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
    env: process.env,
  });
}

function describeDatabaseTarget() {
  try {
    const u = new URL(process.env.DATABASE_URL.replace(/^postgres:\/\//i, "postgresql://"));
    const local = /localhost|127\.0\.0\.1/i.test(u.hostname);
    return `${local ? "local" : "remote"} @ ${u.hostname}:${u.port || "5432"}/${u.pathname.replace(/^\//, "")}`;
  } catch {
    return "(could not parse DATABASE_URL)";
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.error("Missing DATABASE_URL.");
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log("Database schema audit (Milestone 2)");
  // eslint-disable-next-line no-console
  console.log(`Connected: ${describeDatabaseTarget()}\n`);

  const coreMissing = [];
  const optionalMissing = [];
  const stepsToApply = [];

  for (const step of MIGRATION_STEPS) {
    const result = await assessStep(step);
    const status = result.needed ? "MISSING" : "OK";
    const detail = result.needed
      ? [
          result.missingTables.length ? `tables: ${result.missingTables.join(", ")}` : null,
          result.missingColumns.length ? `columns: ${result.missingColumns.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join("; ")
      : "complete";

    // eslint-disable-next-line no-console
    console.log(`[${status}] ${step.label} (${step.feature}) — ${detail}`);

    if (result.needed) {
      if (step.feature === "core") coreMissing.push(step);
      else optionalMissing.push(step);
      if (step.npm) stepsToApply.push(step);
      else if (step.id === "core") {
        coreMissing.push(step);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log("\n--- Row counts ---");
  for (const t of COUNT_TABLES) {
    const c = await countTable(t);
    // eslint-disable-next-line no-console
    console.log(`  ${t}: ${c == null ? "(table missing)" : c}`);
  }

  const scholarshipCount = await countTable("scholarships");

  if (coreMissing.some((s) => s.id === "core")) {
    // eslint-disable-next-line no-console
    console.error(
      "\n✗ Core tables missing. If this is an empty database, apply db/schema.sql once.",
    );
    // eslint-disable-next-line no-console
    console.error("  Do NOT run CONFIRM_DB_RESET on Supabase if it already has data.");
    if (!apply) {
      process.exit(1);
    }
  }

  if (stepsToApply.length > 0 && !apply) {
    // eslint-disable-next-line no-console
    console.log("\nSuggested fixes (idempotent):");
    for (const step of stepsToApply) {
      // eslint-disable-next-line no-console
      console.log(`  npm run ${step.npm}`);
    }
    // eslint-disable-next-line no-console
    console.log("\nOr run all missing steps:");
    // eslint-disable-next-line no-console
    console.log("  npm run verify:db -- --apply");
    process.exit(coreMissing.length > 0 ? 1 : 0);
  }

  if (apply && stepsToApply.length > 0) {
    if (scholarshipCount > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `\nApplying ${stepsToApply.length} migration step(s) (database has ${scholarshipCount} scholarships; no reset).`,
      );
    }
    for (const step of stepsToApply) {
      runNpmScript(step.npm);
    }
    // eslint-disable-next-line no-console
    console.log("\nRe-run: npm run verify:db");
    return;
  }

  if (optionalMissing.length > 0 && coreMissing.length === 0) {
    // eslint-disable-next-line no-console
    console.log("\n⚠ Optional schema gaps (ingestion/admin) — OK for student MVP if unused.");
  }

  if (coreMissing.length === 0) {
    // eslint-disable-next-line no-console
    console.log("\n✓ Core schema looks complete for deployment.");
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
