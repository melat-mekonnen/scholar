# Scholarship Catalog Ingestion Rules

**This file is the source of truth.** All ingestion, import, promotion, and cleanup work must follow it.  
If a shortcut conflicts with these rules, **do not run the shortcut**.

---

## 1. Why counts went up, then down (no real progress)

We mixed **three different strategies** that looked like growth but were not:

| Mistake | What it did | Why it failed |
|--------|-------------|---------------|
| **Bulk URL import** (`import-scholarship-url-catalog.js` with template text) | Turned homepages (`moe.gov.et/en`) into verified cards without fetching pages | Violates “real programme” rule; later rejected |
| **Aggregator auto-verify** | Hub pages (Advance Africa “3500+ Artist Grants”, jobs, blogs) scored high on words like “grant” and became **verified** | Listing pages are not scholarships; later rejected |
| **Aggressive cleanup** (`cleanup-scholarship-quality.js` without safeguards) | Mass-rejected good curated rows | Dropped verified count sharply |

**Net effect:** add 200 → delete 200 → looks like zero progress.  
**Correct approach:** only add rows that pass fetch + classifier **before** they become `verified`. Deletion should be rare (new bad patterns), not the main way to fix quality.

---

## 2. Definition: one valid public scholarship

A row may be **`verified` and visible** only if **all** of the following are true:

1. **Single programme** — one named scholarship, fellowship, or studentship (not a catalog of thousands, not jobs, not “link to us”, not a blog index).
2. **Official leaf URL** — application/source URL is a **programme page**, not:
   - domain homepage (`https://example.edu/`)
   - language root (`/en`, `/fr`)
   - category/hub (`/scholarships/`, `/category/`, `/jobs-in-…`, `/artist-grants-and-opportunities`)
3. **Fetched content** — title and description come from **scraping that URL** (`buildRecordFromOfficialPage`), not invented template text.
4. **Date signal** — at least one of: explicit `deadline`, or `is_rolling = true` with evidence in text (not guessed for hubs).
5. **Not closed** — `application_status <> 'closed'` and description does not say “currently closed” for that cycle (unless intentionally hidden).
6. **Classifier pass** — `classifyScholarshipRecord()` returns `reject: false` (see §4).
7. **Deduped** — no second visible row with the same normalized title or same `application_url`.

**Target metric:** `visible` count = verified + open date rules (see `ScholarshipRepository` public search filter).  
**Not** raw `verified` count including closed/hub junk.

---

## 3. What must NEVER become a card

Reject at ingest or promotion (do not “fix” with delete later):

- Homepages, `/en` portals, ministry roots without a programme path
- Blog/RSS indexes (`african-scholarships-blog`, XML feeds)
- Mega-listing titles: `3500+ …`, `Grants for X. Grants for Y.`, emoji SEO titles (✅☛)
- Jobs pages (`Jobs in Africa`, `Careers in …`)
- NGO grant catalogs (`Call for Proposals`, `Grants for NGOs`, `Artist Grants and Opportunities`)
- Navigation (“Link to Us”, “About Us”, “HomePage”)
- Fabricated import text containing:  
  `Applications may be accepted on a rolling basis when no fixed deadline is published on the official page`
- HTML in titles (`<center>`, `<FONT>`, …)
- Duplicate titles already in catalog (mark `duplicate`, keep newest)

---

## 4. Classifier and quality gate (code)

Enforced in:

- `src/modules/scholarship-ingestion/scholarshipClassifier.js`
- `src/modules/scholarship-ingestion/descriptionQuality.js`
- `src/modules/scholarship-ingestion/qualityGate.js`
- `src/modules/scholarship-ingestion/pipeline/decidePublishStatus.js`

**Aggregator sources** (`AFRICAN_AGGREGATORS`, `FASTWEB`, `US_AGGREGATOR_DISCOVERY`):

- **Never auto-verify at ingest** — status `needs_review` or staging only
- Promote only via `scripts/promote-needs-review-catalog.js` when:
  - Title contains `scholarship`, `fellowship`, or `studentship` (plural OK)
  - Classifier does not reject
  - Quality score ≥ 75 (blocking reasons only)
  - Has deadline or rolling signal

**Government / curated** (`PHASE1_CURATED`):

- Leaf URLs with curated copy allowed when configured in `assembleLeafCatalog.js`
- Still respect `application_status: closed` for closed CSC/Chevening cycles

---

## 5. Correct scaling workflow (order matters)

Do **not** skip steps. Measure after each step.

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase A — Baseline (once per scale push)                        │
│   establish-catalog-safety-baseline.js --label=scale_YYYYMMDD   │
│   Record: visible count, verified count, needs_review count   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase B — Curated leaf (highest trust)                          │
│   sync-phase1-leaf-catalog.js                                   │
│   Only configured programmes in assembleLeafCatalog.js         │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase C — Hub crawl (discover → fetch → staging)                │
│   run-catalog-ingestion.js --source=africa --mode=staging       │
│   NO --promote=true until staging audited                       │
│   Each URL: discover article links → fetch page → skip if weak  │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase D — Publish staging (batch)                             │
│   publish-staging-ready-catalog.js (small batches)              │
│   Output mostly needs_review for aggregators                    │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase E — Promote (strict)                                      │
│   promote-needs-review-catalog.js                               │
│   Only rows passing §2 and §4                                   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase F — Audit (required)                                      │
│   cleanup-invalid-aggregator-listings.js (classifier re-check)  │
│   reject-polluted-scholarships.js (optional, classifier-based)  │
│   SQL: visible count, duplicate titles, bare URLs               │
│   Update VERIFIED_SCHOLARSHIP_FLOOR = current visible (floor)   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Phase G — Repeat C→F for other source groups                    │
│   phase1, africa, daad, erasmus, fastweb (one group per run)    │
│   Never run destructive cleanup-scholarship-quality.js          │
└─────────────────────────────────────────────────────────────────┘
```

### Progress KPIs (report every wave)

| KPI | Query intent |
|-----|----------------|
| **Visible** | Public search rules (verified, not closed, date guard) |
| **needs_review queue** | Should grow during crawl, shrink after promote |
| **Rejected hub rate** | Classifier rejects / total fetched |
| **Duplicate titles** | `GROUP BY normalized title HAVING count > 1` |
| **Floor breach** | Ingestion must abort if visible drops below floor |

**Progress = visible count increases with no rise in rejected-after-the-fact.**

---

## 6. Scripts: allowed vs forbidden

### Allowed for scaling

| Script | Purpose |
|--------|---------|
| `establish-catalog-safety-baseline.js` | Snapshot floor before changes |
| `sync-phase1-leaf-catalog.js` | Curated leaf upserts only |
| `run-catalog-ingestion.js --mode=staging` | Discover + fetch into staging |
| `publish-staging-ready-catalog.js` | Staging → DB (needs_review/verified) |
| `promote-needs-review-catalog.js` | Strict promotion to verified |
| `cleanup-invalid-aggregator-listings.js` | Re-check classifier + title dedupe |
| `reject-polluted-scholarships.js` | Classifier-based (not blind rules) |
| `reject-synthetic-url-catalog.js` | Remove template URL_CATALOG rows |
| `discover-aggregator-urls.js` | Expand URL list only (no auto-verify) |
| `import-scholarship-url-catalog.js` | **Fetch-only** — skips URLs without real page text |

### Forbidden or deprecated without safeguards

| Script | Why |
|--------|-----|
| `import-scholarship-url-catalog.js` (old template mode) | **Removed** — fabricated descriptions |
| `cleanup-scholarship-quality.js` | Mass-rejected verified curated rows |
| `reseed-scholarships.js` | Deletes all scholarships |
| Ingest with `--promote=true` before auditing staging | Promotes hub junk |
| Lowering floor to force green runs | Hides regressions |

---

## 7. Environment and floor guard

```bash
INGEST_PIPELINE_MODE=staging
INGEST_DEDUP_MODE=merge
VERIFIED_SCHOLARSHIP_FLOOR=<current visible count after audit>
```

Floor guard (`verifiedFloorGuard.js`) aborts ingestion if:

- Verified count drops below floor, or
- Per-source run decreases verified count

**Do not disable the floor to “make ingestion pass”.** Fix the source or classifier.

---

## 8. Advance Africa / aggregator hub exclusions

Hub paths excluded in crawler and classifier (extend here when new junk appears):

- `african-scholarships-blog`, `.xml` feeds
- `artist-grants-and-opportunities`
- `jobs-in-*`, `link-to-us`, `call-for-proposals`, `grants-for-ngos`
- `studying-abroad.html` (guide, not one programme)
- `scholarships-for-study-in-africa.html` (index)

---

## 9. Path to 1000+ valid (realistic)

1. **Stop adding junk** — rules in §2–§4 are enforced in code (as of latest changes).
2. **Grow curated leaf** — expand `assembleLeafCatalog.js` with open-cycle programme URLs (100s of real leaves).
3. **Hub crawl → articles only** — aggregators contribute volume only through per-article fetch.
4. **Promote in batches** — only scholarship/fellowship titles pass.
5. **Audit every wave** — visible count must go up; if not, fix discovery/fetch, not promotion.

**Do not** use template URL import or auto-verify aggregators to inflate counts.

---

## 10. When adding a new rule

1. Add pattern to `descriptionQuality.js` or `scholarshipClassifier.js`
2. Add a unit test in `tests/descriptionQuality.test.js` or `tests/qualityGate.test.js`
3. Document the example URL/title in §3 or §8 of this file
4. Run `cleanup-invalid-aggregator-listings.js` once to clean existing DB rows

---

## Related docs

- `catalog-safety-checklist.md` — baseline and floor commands
- `catalog-public-api-contract.md` — what the UI/API may show
- `catalog-schema-signals-checklist.md` — schema fields for dates/eligibility
