"""
Frozen model and data-policy constants for Scholar-ML (Milestone 0).

Change embedding model only with a full re-index (Milestone 5).
Change LLM only after re-validating prompts (Milestone 7).
"""

# --- Embedding (Milestone 5+) ---
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384

# --- Local LLM via Ollama (Milestone 7+) ---
OLLAMA_DEFAULT_HOST = "http://127.0.0.1:11434"
OLLAMA_DEFAULT_MODEL = "llama3.2"
OLLAMA_CHAT_TIMEOUT_SECONDS = 120

# --- Knowledge base export filters (aligned with EthioScholar browse rules) ---
EXPORT_SCHOLARSHIP_STATUS = "verified"
EXPORT_INCLUDE_NULL_DEADLINE = True  # include if deadline IS NULL
EXPORT_DEADLINE_ON_OR_AFTER = "CURRENT_DATE"  # SQL: deadline >= CURRENT_DATE when not null

# --- Curated merge (Milestone 2+) ---
CURATED_TRUSTED_SOURCES_RELPATH = "curated/trusted_sources.jsonl"
MERGED_KNOWLEDGE_BASE_RELPATH = "data/knowledge_base.merged.jsonl"
MERGE_DEDUPE_CURATED_BY_URL_DEFAULT = True  # skip curated row if URL already in DB export

# --- Preprocess / clean (Milestone 3+) ---
PREPROCESS_INPUT_RELPATH = "data/knowledge_base.merged.jsonl"
PREPROCESS_OUTPUT_RELPATH = "data/knowledge_base.clean.jsonl"
PREPROCESS_STATS_RELPATH = "data/knowledge_base.clean.stats.json"
PREPROCESS_LOWERCASE_TEXT = False  # keep casing by default for readability

# --- Chunking defaults (Milestone 4+) ---
CHUNK_TARGET_CHARS = 600
CHUNK_OVERLAP_CHARS = 80
CHUNK_INPUT_RELPATH = "data/knowledge_base.clean.jsonl"
CHUNK_OUTPUT_RELPATH = "data/chunks.jsonl"
CHUNK_STATS_RELPATH = "data/chunks.stats.json"

# --- Embeddings + index build (Milestone 5+) ---
INDEX_INPUT_CHUNKS_RELPATH = "data/chunks.jsonl"
INDEX_OUTPUT_FAISS_RELPATH = "artifacts/index.faiss"
INDEX_OUTPUT_META_RELPATH = "artifacts/chunks_meta.json"
INDEX_OUTPUT_STATS_RELPATH = "artifacts/index.stats.json"

# --- Retrieval defaults (Milestone 6+) ---
RETRIEVAL_TOP_K = 10
RERANK_TOP_K = 5  # optional cross-encoder in v1.1
# When filters are set, search more FAISS neighbors then apply hard filters (IndexFlatIP is cheap).
RETRIEVAL_FILTER_OVERSAMPLE = 5

# --- Prompt / chat defaults (Milestone 7+) ---
CHAT_CONTEXT_TOP_K = 5
CHAT_GENERAL_SUGGESTION_TOP_K = 2  # optional programs for general (non-greeting) queries
CHAT_MAX_MESSAGE_CHARS = 4000

# --- FastAPI service (Milestone 8+) ---
API_VERSION = "0.1.0"
API_DEFAULT_HOST = "0.0.0.0"
API_DEFAULT_PORT = 8020
API_MAX_REQUEST_BYTES = 32_768
