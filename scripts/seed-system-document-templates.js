const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { query, pool } = require("../src/infra/db/neonClient");

const TEMPLATES_DIR = path.join(__dirname, "assets");

const TEMPLATES = [
  {
    title: "CV template (EthioScholar)",
    type: "cv_template",
    assetFile: "cv-template-ethischolar.txt",
    downloadName: "ethischolar-cv-template.txt",
  },
  {
    title: "Resume template (EthioScholar)",
    type: "resume_template",
    assetFile: "resume-template-ethischolar.txt",
    downloadName: "ethischolar-resume-template.txt",
  },
  {
    title: "Cover letter template (EthioScholar)",
    type: "cover_letter_template",
    assetFile: "cover-letter-template-ethischolar.txt",
    downloadName: "ethischolar-cover-letter-template.txt",
  },
];

async function main() {
  const uploadRoot = path.resolve(process.cwd(), "uploads", "documents", "system-templates");
  fs.mkdirSync(uploadRoot, { recursive: true });

  for (const t of TEMPLATES) {
    const existing = await query(`SELECT id FROM documents WHERE title = $1 LIMIT 1`, [t.title]);
    if (existing.rows[0]?.id) {
      // eslint-disable-next-line no-console
      console.log("skip (exists):", t.title);
      continue;
    }

    const src = path.join(TEMPLATES_DIR, t.assetFile);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing asset file: ${src}`);
    }
    const body = fs.readFileSync(src, "utf8");
    const id = randomUUID();
    const dest = path.join(uploadRoot, `${id}-${t.downloadName}`);
    fs.writeFileSync(dest, body, "utf8");
    const stat = fs.statSync(dest);

    await query(
      `INSERT INTO documents (
         id, title, type, file_path, original_name, mime_type, file_size,
         scholarship_id, uploaded_by_user_id, download_count
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0)`,
      [
        id,
        t.title,
        t.type,
        dest,
        t.downloadName,
        "text/plain; charset=utf-8",
        stat.size,
        null,
        null,
      ],
    );
    // eslint-disable-next-line no-console
    console.log("inserted:", t.title, id);
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("seed-system-document-templates failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
