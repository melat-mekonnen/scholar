const { query } = require("../infra/db/neonClient");
const { formatSourceHealthRow } = require("../modules/scholarship-ingestion/sourceHealth");

class ScholarshipIngestionRepository {
  async createRun({ sourceName }) {
    const result = await query(
      `INSERT INTO scholarship_import_runs (source_name, status)
       VALUES ($1, 'running')
       RETURNING id, source_name, status, started_at`,
      [sourceName],
    );
    return result.rows[0];
  }

  async completeRun({ runId, fetched, upserted, failed, skipped = 0 }) {
    await query(
      `UPDATE scholarship_import_runs
       SET status = 'completed',
           finished_at = NOW(),
           records_fetched = $2,
           records_upserted = $3,
           records_failed = $4,
           records_skipped = $5
       WHERE id = $1`,
      [runId, fetched, upserted, failed, skipped],
    );
  }

  async failRun({ runId, fetched, upserted, failed, skipped = 0, errorMessage }) {
    await query(
      `UPDATE scholarship_import_runs
       SET status = 'failed',
           finished_at = NOW(),
           records_fetched = $2,
           records_upserted = $3,
           records_failed = $4,
           records_skipped = $5,
           error_message = $6
       WHERE id = $1`,
      [runId, fetched, upserted, failed, skipped, String(errorMessage || "Unknown import error")],
    );
  }

  async addRawRecord({ runId, sourceName, sourceUrl, externalId, payload, normalizedPayload }) {
    await query(
      `INSERT INTO scholarship_raw_imports
         (run_id, source_name, source_url, external_id, payload, normalized_payload)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
      [
        runId,
        sourceName,
        sourceUrl || null,
        externalId || null,
        JSON.stringify(payload || {}),
        JSON.stringify(normalizedPayload || {}),
      ],
    );
  }

  async addError({ runId, sourceName, sourceUrl, externalId, errorType, errorMessage, payload }) {
    await query(
      `INSERT INTO scholarship_import_errors
         (run_id, source_name, source_url, external_id, error_type, error_message, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        runId,
        sourceName,
        sourceUrl || null,
        externalId || null,
        errorType,
        String(errorMessage || "Unknown error"),
        JSON.stringify(payload || {}),
      ],
    );
  }

  async listRuns({ limit = 50 }) {
    const result = await query(
      `SELECT id, source_name, status, started_at, finished_at,
              records_fetched, records_upserted, records_failed, records_skipped, error_message
       FROM scholarship_import_runs
       ORDER BY started_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  async listErrors({ limit = 100 }) {
    const result = await query(
      `SELECT id, run_id, source_name, source_url, external_id, error_type, error_message, created_at
       FROM scholarship_import_errors
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  async listSourceHealth() {
    const result = await query(
      `WITH latest AS (
         SELECT DISTINCT ON (source_name)
           source_name,
           status AS last_status,
           finished_at AS last_crawl_at,
           records_fetched AS last_fetched,
           records_upserted AS last_upserted,
           records_failed AS last_failed,
           records_skipped AS last_skipped,
           error_message AS last_error
         FROM scholarship_import_runs
         WHERE finished_at IS NOT NULL
         ORDER BY source_name, finished_at DESC
       ),
       stats AS (
         SELECT
           source_name,
           COUNT(*)::int AS total_runs,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_runs,
           COALESCE(SUM(records_fetched), 0)::int AS total_fetched,
           COALESCE(SUM(records_failed), 0)::int AS total_failed,
           COALESCE(SUM(records_skipped), 0)::int AS total_skipped
         FROM scholarship_import_runs
         GROUP BY source_name
       )
       SELECT
         COALESCE(l.source_name, s.source_name) AS source_name,
         l.last_crawl_at,
         l.last_status,
         l.last_fetched,
         l.last_upserted,
         l.last_failed,
         l.last_skipped,
         l.last_error,
         COALESCE(s.total_runs, 0) AS total_runs,
         COALESCE(s.failed_runs, 0) AS failed_runs,
         COALESCE(s.total_fetched, 0) AS total_fetched,
         COALESCE(s.total_failed, 0) AS total_failed,
         COALESCE(s.total_skipped, 0) AS total_skipped
       FROM stats s
       FULL OUTER JOIN latest l ON l.source_name = s.source_name
       ORDER BY source_name ASC`,
      [],
    );
    return result.rows.map(formatSourceHealthRow);
  }
}

module.exports = { ScholarshipIngestionRepository };
