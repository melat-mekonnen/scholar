const { query } = require("../infra/db/neonClient");

class ScholarshipStagingRepository {
  async upsertCaptured({
    runId,
    canonicalKey,
    sourceName,
    sourceUrl,
    externalId,
    pipelineStatus,
    validationErrors = [],
    gateReasons = [],
    qualityScore = null,
    normalizedPayload,
    rawPayload,
  }) {
    const result = await query(
      `INSERT INTO scholarship_staging (
         run_id, canonical_key, source_name, source_url, external_id,
         pipeline_status, validation_errors, gate_reasons, quality_score,
         normalized_payload, raw_payload
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10::jsonb,$11::jsonb)
       ON CONFLICT (canonical_key, source_name)
       DO UPDATE SET
         run_id = EXCLUDED.run_id,
         source_url = EXCLUDED.source_url,
         external_id = COALESCE(EXCLUDED.external_id, scholarship_staging.external_id),
         pipeline_status = CASE
           WHEN scholarship_staging.pipeline_status = 'published' THEN scholarship_staging.pipeline_status
           ELSE EXCLUDED.pipeline_status
         END,
         validation_errors = EXCLUDED.validation_errors,
         gate_reasons = EXCLUDED.gate_reasons,
         quality_score = COALESCE(EXCLUDED.quality_score, scholarship_staging.quality_score),
         normalized_payload = EXCLUDED.normalized_payload,
         raw_payload = EXCLUDED.raw_payload,
         updated_at = NOW()
       RETURNING id, pipeline_status, scholarship_id`,
      [
        runId,
        canonicalKey,
        sourceName,
        sourceUrl || null,
        externalId || null,
        pipelineStatus,
        JSON.stringify(validationErrors || []),
        JSON.stringify(gateReasons || []),
        qualityScore,
        JSON.stringify(normalizedPayload || {}),
        JSON.stringify(rawPayload || {}),
      ],
    );
    return result.rows[0];
  }

  async listForPublish({ sourceName = null, limit = 500 } = {}) {
    const params = [];
    let where = `pipeline_status IN ('captured', 'validated', 'ready')`;
    if (sourceName) {
      params.push(sourceName);
      where += ` AND source_name = $${params.length}`;
    }
    params.push(limit);
    const result = await query(
      `SELECT id, run_id, canonical_key, source_name, source_url, external_id,
              pipeline_status, validation_errors, gate_reasons, quality_score,
              normalized_payload, raw_payload, scholarship_id
       FROM scholarship_staging
       WHERE ${where}
       ORDER BY quality_score DESC NULLS LAST, updated_at ASC
       LIMIT $${params.length}`,
      params,
    );
    return result.rows;
  }

  async markPublished({ stagingId, scholarshipId, pipelineStatus = "published" }) {
    await query(
      `UPDATE scholarship_staging
       SET pipeline_status = $3,
           scholarship_id = $2,
           published_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [stagingId, scholarshipId, pipelineStatus],
    );
  }

  async markQuarantined({ stagingId, gateReasons = [], validationErrors = [] }) {
    await query(
      `UPDATE scholarship_staging
       SET pipeline_status = 'quarantined',
           gate_reasons = $2::jsonb,
           validation_errors = $3::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [stagingId, JSON.stringify(gateReasons || []), JSON.stringify(validationErrors || [])],
    );
  }

  async countByStatus() {
    const result = await query(
      `SELECT pipeline_status, COUNT(*)::int AS n
       FROM scholarship_staging
       GROUP BY pipeline_status
       ORDER BY pipeline_status`,
    );
    return result.rows;
  }
}

module.exports = { ScholarshipStagingRepository };
