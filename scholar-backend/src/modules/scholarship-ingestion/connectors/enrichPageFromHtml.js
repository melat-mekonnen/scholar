const {
  isGenericBoilerplate,
  isPollutedDescription,
  isLowQualityTitle,
  mergeDescription,
} = require("../descriptionQuality");

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function cleanText(value) {
  return decodeHtmlEntities(String(value || "").replace(/\s+/g, " ").trim());
}

function stripTags(html) {
  return cleanText(String(html || "").replace(/<[^>]+>/g, " "));
}

function stripPageChrome(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ");
}

function extractTagContent(html, tagName) {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const m = html.match(re);
  return m ? stripTags(m[1]) : null;
}

function extractMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const m = html.match(re);
  return m ? cleanText(m[1]) : null;
}

function extractParagraphsFromRegion(regionHtml, maxParagraphs = 12) {
  if (!regionHtml) return [];
  return [...regionHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((p) => p.length >= 50 && !/^cookie/i.test(p))
    .filter((p) => !isGenericBoilerplate(p))
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .slice(0, maxParagraphs);
}

function extractContentRegions(html) {
  const stripped = stripPageChrome(html);
  const regions = [];

  const classPatterns = [
    /class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /class=["'][^"']*page-content[^"']*["'][^>]*>([\s\S]{400,12000})/i,
    /class=["'][^"']*field--name-body[^"']*["'][^>]*>([\s\S]{200,12000})/i,
    /class=["'][^"']*content-area[^"']*["'][^>]*>([\s\S]{200,12000})/i,
  ];

  for (const re of classPatterns) {
    const m = stripped.match(re);
    if (m?.[1]) regions.push(m[1]);
  }

  const article = stripped.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  const main = stripped.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (article) regions.push(article);
  if (main) regions.push(main);

  regions.push(stripped);
  return regions;
}

function extractMainParagraphs(html, maxParagraphs = 10) {
  const regions = extractContentRegions(html);
  let best = [];
  for (const region of regions) {
    const paragraphs = extractParagraphsFromRegion(region, maxParagraphs);
    if (paragraphs.length > best.length) {
      best = paragraphs;
    }
  }
  return best;
}

function extractListItems(html, maxItems = 8) {
  const stripped = stripPageChrome(html);
  const items = [...stripped.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((t) => t.length >= 25 && t.length <= 400)
    .filter((t) => !isGenericBoilerplate(t))
    .filter((t, i, arr) => arr.indexOf(t) === i);
  return items.slice(0, maxItems);
}

function extractJsonLdDescription(html) {
  const scripts = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  for (const m of scripts) {
    try {
      const data = JSON.parse(m[1]);
      const found = findDescriptionInJsonLd(data);
      if (found && !isGenericBoilerplate(found)) return found;
    } catch {
      // ignore invalid JSON-LD
    }
  }
  return null;
}

function findDescriptionInJsonLd(node) {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const d = findDescriptionInJsonLd(item);
      if (d) return d;
    }
    return null;
  }
  if (typeof node === "object") {
    if (typeof node.description === "string" && node.description.length >= 80) {
      return cleanText(node.description);
    }
    for (const value of Object.values(node)) {
      const d = findDescriptionInJsonLd(value);
      if (d) return d;
    }
  }
  return null;
}

function extractAfterPrimaryHeading(html) {
  const stripped = stripPageChrome(html);
  const h1Block = stripped.match(/<h1[^>]*>([\s\S]*?)<\/h1>([\s\S]{0,6000})/i);
  if (!h1Block) return null;

  const paragraphs = extractParagraphsFromRegion(h1Block[2], 8);
  return paragraphs.length ? paragraphs.join("\n\n") : null;
}

function extractRegionHeadingParagraph(html, url) {
  let slug = "";
  try {
    slug = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
  } catch {
    slug = "";
  }
  if (!slug || slug.length < 3) return null;

  const label = slug.replace(/-/g, " ");
  const headingRe = new RegExp(
    `<h[1-3][^>]*>[^<]*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<]*</h[1-3]>([\\s\\S]{0,3500})`,
    "i",
  );
  const block = stripPageChrome(html).match(headingRe)?.[1];
  if (!block) return null;

  const paragraphs = extractParagraphsFromRegion(block, 6);
  return paragraphs.length ? paragraphs.join("\n\n") : null;
}

function extractDeadlineIso(text) {
  const raw = String(text || "");
  const iso = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const named = raw.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i,
  );
  if (named) {
    const months = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };
    const mm = months[named[2].toLowerCase()];
    const dd = String(named[1]).padStart(2, "0");
    return `${named[3]}-${mm}-${dd}`;
  }
  return null;
}

function extractDeadlineFromHtml(html) {
  const deadlineSection = html.match(/deadline[s]?[^<]{0,80}([\s\S]{0,500})/i)?.[1];
  return extractDeadlineIso(deadlineSection || html);
}

function extractFundingHint(text) {
  const t = String(text || "").toLowerCase();
  if (/fully\s*funded|full\s+tuition|covers\s+tuition/i.test(t)) return "fully_funded";
  if (/partial(?:ly)?\s+funded|partial\s+scholarship/i.test(t)) return "partially_funded";
  return null;
}

function is404PageHtml(html, titleRaw) {
  const title = String(titleRaw || "");
  if (/404|not found/i.test(title) && title.length < 80) return true;
  if (/The page you requested could not be found/i.test(html)) return true;
  if (/Oops!\s*That page can't be found/i.test(html)) return true;
  return false;
}

function enrichRecordFromHtml(html, url) {
  const titleRaw = extractMeta(html, "og:title") || extractTagContent(html, "title");
  if (is404PageHtml(html, titleRaw)) {
    return {
      title: titleRaw ? cleanText(titleRaw) : null,
      description: null,
      descriptionFromSite: false,
      deadline: null,
      fundingType: null,
      applicationUrl: url,
    };
  }
  const metaDesc = extractMeta(html, "description") || extractMeta(html, "og:description");
  const jsonLdDesc = extractJsonLdDescription(html);
  const paragraphs = extractMainParagraphs(html);
  const bullets = extractListItems(html);
  const regionParagraph = extractRegionHeadingParagraph(html, url);
  const headingParagraph = extractAfterPrimaryHeading(html);

  const introCandidates = [
    jsonLdDesc,
    metaDesc && !isGenericBoilerplate(metaDesc) ? metaDesc : null,
    headingParagraph,
    regionParagraph,
  ].filter(Boolean);

  const intro = introCandidates[0] || null;

  const description =
    mergeDescription({
      intro,
      paragraphs: [
        ...(headingParagraph ? [headingParagraph] : []),
        ...(regionParagraph ? [regionParagraph] : []),
        ...paragraphs,
      ],
      bullets,
      minLength: 100,
    }) ||
    (headingParagraph && !isGenericBoilerplate(headingParagraph) ? headingParagraph : null) ||
    (regionParagraph && !isGenericBoilerplate(regionParagraph) ? regionParagraph : null) ||
    (jsonLdDesc && !isGenericBoilerplate(jsonLdDesc) ? jsonLdDesc : null);

  const metaFallback =
    metaDesc &&
    metaDesc.length >= 55 &&
    !isGenericBoilerplate(metaDesc) &&
    !isPollutedDescription(metaDesc)
      ? cleanText(metaDesc)
      : null;

  const bestDescription =
    description && description.length >= 100 && !isPollutedDescription(description)
      ? description
      : metaFallback;

  const cleanedTitle = titleRaw ? cleanText(titleRaw) : null;
  const descriptionFromSite = Boolean(
    bestDescription &&
      bestDescription.length >= (metaFallback && bestDescription === metaFallback ? 55 : 100) &&
      !isPollutedDescription(bestDescription) &&
      !isLowQualityTitle(cleanedTitle),
  );

  const deadline = extractDeadlineFromHtml(html);
  const fundingType = extractFundingHint(`${description || ""} ${paragraphs.join(" ")}`);

  return {
    title: cleanedTitle && !isLowQualityTitle(cleanedTitle) ? cleanedTitle : null,
    description: descriptionFromSite ? bestDescription : bestDescription,
    descriptionFromSite,
    deadline,
    fundingType,
    applicationUrl: url,
  };
}

module.exports = {
  enrichRecordFromHtml,
  decodeHtmlEntities,
  cleanText,
};
