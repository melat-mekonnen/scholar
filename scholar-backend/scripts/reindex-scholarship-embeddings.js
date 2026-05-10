const { ScholarshipRepository } = require("../src/repositories/ScholarshipRepository");
const { batchScholarshipEmbeddings } = require("../src/services/embeddingService");

async function main() {
  const repo = new ScholarshipRepository();
  const batchSize = 50;

  while (true) {
    const scholarships = await repo.listScholarshipsForEmbedding({ limit: batchSize });
    if (!scholarships.length) {
      console.log("No more scholarships to index.");
      break;
    }

    const embeds = await batchScholarshipEmbeddings(scholarships);
    for (const { scholarship, embedding } of embeds) {
      await repo.updateScholarshipEmbedding(scholarship.id, embedding);
      console.log(`Updated embedding for scholarship ${scholarship.id}`);
    }
  }
}

main().catch((err) => {
  console.error("Failed to reindex scholarship embeddings:", err);
  process.exit(1);
});
