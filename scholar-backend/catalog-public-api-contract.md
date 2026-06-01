# Catalog Public API Contract

This contract defines the minimum shape used by scholarship browse cards and scholarship detail views.

## Scope

- `GET /api/scholarships/search`
- `GET /api/scholarships/:id`

## Public visibility rules

- Public catalog shows verified opportunities only.
- Expired opportunities are hidden from public browse/detail results.
- Non-public statuses (`pending`, `needs_review`, `rejected`, `draft`) are not returned to anonymous/student browse.

## Browse card contract (minimum fields)

Each item in `search.results` should provide:

- `id` (uuid)
- `recordType` (`scholarship` | `study_programme`)
- `title`
- `organizationName`
- `country`
- `degreeLevel`
- `fundingType` (nullable)
- `deadline` (nullable)
- `startDate` (nullable)
- `endDate` (nullable)
- `isRolling` (boolean)
- `amount` (nullable)
- `description` (nullable)
- `applicationUrl` (nullable)
- `bookmarkCount` (number)
- `isBookmarked` (boolean)

## Detail contract (additional fields)

Detail payload extends card fields with:

- `titleEn`, `titleAm`
- `descriptionEn`, `descriptionAm`
- `hostCountry` (nullable)
- `applicationStatus` (nullable)
- `createdAt`
- optional `postedBy` object when available

## Description format contract

- Preferred format is sectioned markdown using `##` headings.
- Allowed fallback is plain text; UI renders it as a single `About` section.
- Description must be clean, programme-specific content (no listing-hub boilerplate).

## Localization behavior

- `?lang=am` uses Amharic title/description when available.
- Missing Amharic values gracefully fall back to English.
