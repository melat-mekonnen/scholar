const { query } = require("../../infra/db/neonClient");

const BASELINE_TABLE = "scholarship_catalog_baselines";

function parseFloor(value) {
  if (value == null || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

async function tableExists(tableName, queryFn = query) {
  const result = await queryFn("SELECT to_regclass($1) AS regclass", [tableName]);
  return Boolean(result.rows?.[0]?.regclass);
}

async function countVerifiedScholarships(queryFn = query) {
  const result = await queryFn(
    `SELECT COUNT(*)::int AS total
       FROM scholarships
      WHERE status = 'verified'
        AND COALESCE(record_type, 'scholarship') = 'scholarship'`,
  );
  return Number(result.rows?.[0]?.total || 0);
}

async function readBaselineFloor(queryFn = query) {
  const exists = await tableExists(BASELINE_TABLE, queryFn);
  if (!exists) return null;

  const result = await queryFn(
    `SELECT MAX(verified_count)::int AS floor
       FROM ${BASELINE_TABLE}
      WHERE verified_count IS NOT NULL`,
  );
  const floor = result.rows?.[0]?.floor;
  return floor == null ? null : Number(floor);
}

async function resolveVerifiedFloor({
  explicitFloor = null,
  queryFn = query,
} = {}) {
  const candidates = [parseFloor(explicitFloor), await readBaselineFloor(queryFn)].filter(
    (v) => Number.isFinite(v),
  );
  if (!candidates.length) return 0;
  return Math.max(...candidates);
}

function assertVerifiedFloor({
  count,
  floor,
  operation = "operation",
}) {
  if (!Number.isFinite(floor) || floor <= 0) return;
  if (count >= floor) return;
  throw new Error(
    `Verified scholarship floor violation after ${operation}: count=${count}, floor=${floor}`,
  );
}

module.exports = {
  BASELINE_TABLE,
  parseFloor,
  countVerifiedScholarships,
  readBaselineFloor,
  resolveVerifiedFloor,
  assertVerifiedFloor,
};
