const { query } = require("../infra/db/neonClient");

class DiscoveryRepository {
  async listActiveSources() {
    const result = await query(
      `SELECT id, name, url, source_type, status, trust_score, last_crawled_at, created_by
       FROM scholarship_sources
       WHERE status = 'verified' AND is_active = TRUE
       ORDER BY trust_score DESC, name ASC`,
      [],
    );
    return result.rows;
  }

  async listSources() {
    const result = await query(
      `SELECT id, name, url, source_type, status, trust_score, is_active, last_crawled_at, created_by, created_at, updated_at, metadata
       FROM scholarship_sources
       ORDER BY created_at DESC`,
      [],
    );
    return result.rows;
  }

  async createSource({ name, sourceType, url, status = 'pending', trustScore = 0.5, isActive = true, createdBy = null, metadata = {} }) {
    const result = await query(
      `INSERT INTO scholarship_sources (
         name, url, source_type, status, trust_score, is_active, created_by, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (url)
       DO UPDATE SET
         name = EXCLUDED.name,
         source_type = EXCLUDED.source_type,
         status = EXCLUDED.status,
         trust_score = EXCLUDED.trust_score,
         is_active = EXCLUDED.is_active,
         created_by = COALESCE(EXCLUDED.created_by, scholarship_sources.created_by),
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING id, name, url, source_type, status, trust_score, is_active, last_crawled_at, created_by, metadata`,
      [name, url, sourceType, status, Number(trustScore) || 0.5, Boolean(isActive), createdBy, metadata],
    );
    return result.rows[0] || null;
  }

  async touchSource(sourceId) {
    await query(
      `UPDATE scholarship_sources
       SET last_crawled_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [sourceId],
    );
  }

  async saveRawItem({ sourceId, itemTitle, itemUrl, publishedAt, payload }) {
    const result = await query(
      `INSERT INTO scholarship_discovery_raw_items (
         source_id, item_title, item_url, published_at, payload
       )
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (item_url)
       DO NOTHING
       RETURNING id`,
      [sourceId, itemTitle || null, itemUrl, publishedAt || null, payload || {}],
    );
    return result.rows[0] || null;
  }

  async listUnprocessedItems(limit = 25) {
    const result = await query(
      `SELECT r.id,
              r.source_id,
              r.item_title,
              r.item_url,
              r.published_at,
              r.payload,
              s.name AS source_name,
              s.source_type,
              s.url AS source_url,
              s.trust_score,
              s.metadata
       FROM scholarship_discovery_raw_items r
       JOIN scholarship_sources s ON s.id = r.source_id
       WHERE r.processed_at IS NULL
       ORDER BY r.collected_at ASC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  async markRawItemProcessed(id, error = null) {
    await query(
      `UPDATE scholarship_discovery_raw_items
       SET processed_at = NOW(),
           process_error = $2
       WHERE id = $1`,
      [id, error || null],
    );
  }
}

module.exports = { DiscoveryRepository };

