function normalizeText(value) {
  if (!value) return "";
  return String(value).toLowerCase().trim();
}

function estimatePrestige(scholarship) {
  const title = normalizeText(scholarship.title);
  const organization = normalizeText(scholarship.organization_name || scholarship.organizationName);
  const description = normalizeText(scholarship.description);
  const prestigeKeywords = [
    "prestigious",
    "distinguished",
    "fellowship",
    "excellence",
    "honor",
    "scholarship of excellence",
    "global leader",
    "research grant",
    "merit",
    "elite",
    "rhodes",
    "marshall",
    "gates",
    "fulbright",
    "scholars",
  ];

  const text = [title, organization, description].join(" ");
  return prestigeKeywords.reduce((acc, keyword) => acc + (text.includes(keyword) ? 18 : 0), 0);
}

function estimateFundingStrength(scholarship) {
  const fundingType = normalizeText(scholarship.funding_type || scholarship.fundingType || "");
  const amount = Number(scholarship.amount || 0);

  if (fundingType.includes("fully funded") || fundingType.includes("full scholarship")) {
    return 30;
  }
  if (amount >= 50000) {
    return 26;
  }
  if (amount >= 20000) {
    return 18;
  }
  if (amount > 0) {
    return 12;
  }
  return 6;
}

function estimateDegreeCompetitiveness(degreeLevel) {
  const degree = normalizeText(degreeLevel);
  if (degree === "phd") return 25;
  if (degree === "master") return 18;
  if (degree === "bachelor") return 12;
  return 8;
}

function estimateCountryCompetitiveness(country) {
  const normalized = normalizeText(country);
  const highDemand = [
    "united states",
    "usa",
    "uk",
    "united kingdom",
    "canada",
    "australia",
    "germany",
    "france",
    "netherlands",
    "japan",
    "sweden",
    "switzerland",
    "singapore",
  ];
  if (highDemand.some((value) => normalized.includes(value))) {
    return 20;
  }
  if (normalized) {
    return 12;
  }
  return 6;
}

function estimateCompetitiveness(scholarship) {
  const prestige = estimatePrestige(scholarship);
  const funding = estimateFundingStrength(scholarship);
  const degree = estimateDegreeCompetitiveness(scholarship.degree_level);
  const country = estimateCountryCompetitiveness(scholarship.country);

  const score = Math.min(100, prestige + funding + degree + country);

  let label = "moderate";
  if (score >= 70) {
    label = "high";
  } else if (score <= 40) {
    label = "low";
  }

  return {
    label,
    score,
  };
}

function estimateDifficulty(scholarship) {
  const fundingType = normalizeText(scholarship.funding_type || scholarship.fundingType || "");
  const amount = Number(scholarship.amount || 0);
  const degree = normalizeText(scholarship.degree_level);
  const prestige = estimatePrestige(scholarship);
  const country = normalizeText(scholarship.country || "");

  const isFullyFunded = fundingType.includes("fully funded") || fundingType.includes("full scholarship");
  const isHighAmount = amount >= 50000;
  const isPhd = degree === "phd";
  const isPrestigious = prestige >= 18;
  const isHighDemandCountry = ["usa", "united states", "uk", "united kingdom", "canada", "australia", "germany", "japan"].some((value) => country.includes(value));

  if (isPhd && (isFullyFunded || isHighAmount) && (isPrestigious || isHighDemandCountry)) {
    return "elite";
  }
  if ((isHighAmount || isFullyFunded) && (isPrestigious || isHighDemandCountry)) {
    return "competitive";
  }
  if (degree === "bachelor" && !isHighAmount && !isFullyFunded) {
    return "easy";
  }
  return "moderate";
}

module.exports = {
  estimateCompetitiveness,
  estimateDifficulty,
};
