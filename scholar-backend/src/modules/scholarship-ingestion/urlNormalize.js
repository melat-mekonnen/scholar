function normalizeUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url.trim());
    const fragment = parsed.hash;
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
    for (const key of drop) {
      parsed.searchParams.delete(key);
    }
    let out = parsed.toString();
    if (out.endsWith("/")) out = out.slice(0, -1);
    if (fragment && /^#nominator-/i.test(fragment)) {
      out += fragment.toLowerCase();
    }
    return out;
  } catch {
    return null;
  }
}

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilarity(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const wa = new Set(na.split(" "));
  const wb = new Set(nb.split(" "));
  let inter = 0;
  for (const w of wa) {
    if (wb.has(w)) inter += 1;
  }
  const union = wa.size + wb.size - inter;
  return union === 0 ? 0 : inter / union;
}

module.exports = { normalizeUrl, normalizeTitle, titleSimilarity };
