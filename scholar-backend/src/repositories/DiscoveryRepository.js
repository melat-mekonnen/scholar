const { query } = require("../infra/db/neonClient");

class DiscoveryRepository {
  async listActiveSources() {
    const result = await query(
      `SELECT id, source_name, source_type, source_url, organization_name, domain, is_active, last_fetched_at
       FROM scholarship_discovery_sources
       WHERE is_active = TRUE
       ORDER BY source_name ASC`,
      [],
    );
    return result.rows;
  }

  async listSources() {
    const result = await query(
      `SELECT id, source_name, source_type, source_url, organization_name, domain, is_active, last_fetched_at, created_at
       FROM scholarship_discovery_sources
       ORDER BY created_at DESC`,
      [],
    );
    return result.rows;
  }

  async createSource({ sourceName, sourceType, sourceUrl, organizationName, domain, isActive = true }) {
    const result = await query(
      `INSERT INTO scholarship_discovery_sources (
         source_name, source_type, source_url, organization_name, domain, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (source_url)
       DO UPDATE SET
         source_name = EXCLUDED.source_name,
         source_type = EXCLUDED.source_type,
         organization_name = EXCLUDED.organization_name,
         domain = EXCLUDED.domain,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING id, source_name, source_type, source_url, organization_name, domain, is_active`,
      [sourceName, sourceType, sourceUrl, organizationName || null, domain || null, Boolean(isActive)],
    );
    return result.rows[0] || null;
  }

  async touchSource(sourceId) {
    await query(
      `UPDATE scholarship_discovery_sources
       SET last_fetched_at = NOW(), updated_at = NOW()
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
              s.source_name,
              s.source_type,
              s.domain
       FROM scholarship_discovery_raw_items r
       JOIN scholarship_discovery_sources s ON s.id = r.source_id
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

