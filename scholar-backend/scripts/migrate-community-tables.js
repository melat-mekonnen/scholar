const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `CREATE TABLE IF NOT EXISTS community_channels (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    [],
  );

  await query(
    `CREATE TABLE IF NOT EXISTS community_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_message_id UUID REFERENCES community_messages(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT community_messages_body_len CHECK (char_length(body) >= 1 AND char_length(body) <= 8000)
    )`,
    [],
  );

  await query(
    "CREATE INDEX IF NOT EXISTS idx_community_messages_channel_created ON community_messages(channel_id, created_at DESC)",
    [],
  );
  await query(
    "CREATE INDEX IF NOT EXISTS idx_community_messages_parent ON community_messages(parent_message_id)",
    [],
  );

  const seeds = [
    {
      slug: "welcome",
      name: "Welcome & introductions",
      description: "Say hello and meet other applicants.",
      sort_order: 0,
    },
    {
      slug: "application-steps",
      name: "Application steps & timelines",
      description: "Walk through forms, deadlines, and checklists together.",
      sort_order: 1,
    },
    {
      slug: "experiences",
      name: "Experiences & stories",
      description: "Share wins, setbacks, and what worked for you.",
      sort_order: 2,
    },
    {
      slug: "feedback",
      name: "Feedback & critique",
      description: "Constructive peer review of essays, CVs, and plans.",
      sort_order: 3,
    },
  ];

  for (const s of seeds) {
    await query(
      `INSERT INTO community_channels (slug, name, description, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO NOTHING`,
      [s.slug, s.name, s.description, s.sort_order],
    );
  }

  // eslint-disable-next-line no-console
  console.log("community tables migration completed");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("community migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
