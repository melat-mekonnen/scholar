const { query } = require("../infra/db/neonClient");

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

  async completeRun({ runId, fetched, upserted, failed }) {
    await query(
      `UPDATE scholarship_import_runs
       SET status = 'completed',
           finished_at = NOW(),
           records_fetched = $2,
           records_upserted = $3,
           records_failed = $4
       WHERE id = $1`,
      [runId, fetched, upserted, failed],
    );
  }

  async failRun({ runId, fetched, upserted, failed, errorMessage }) {
    await query(
      `UPDATE scholarship_import_runs
       SET status = 'failed',
           finished_at = NOW(),
           records_fetched = $2,
           records_upserted = $3,
           records_failed = $4,
           error_message = $5
       WHERE id = $1`,
      [runId, fetched, upserted, failed, String(errorMessage || "Unknown import error")],
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
      `SELECT id, source_name, status, started_at, finished_at, records_fetched, records_upserted, records_failed, error_message
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
}

module.exports = { ScholarshipIngestionRepository };
