function normalizeText(value) {
  if (!value) return "";
  return String(value).toLowerCase().trim();
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => normalizeText(item));
  if (typeof value === "string") {
    return value
      .split(/[,;|]/)
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }
  return [];
}

function detectKeywordSignal(text, keywords) {
  if (!text) return false;
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(keyword));
}

function collectProfileSignals(profile) {
  const signals = [];
  const interests = normalizeList(profile.interests || profile.interests || []);
  const languages = normalizeList(profile.language_proficiency || profile.languageProficiency || []);
  const goals = normalizeText(profile.goals || profile.goals || "");

  const combinedText = [interests.join(" "), goals].filter(Boolean).join(" ");

  const hasExtracurricular = interests.length > 0 || Boolean(goals);
  const hasLeadership = detectKeywordSignal(combinedText, [
    "leadership",
    "leader",
    "captain",
    "president",
    "chair",
    "organized",
    "coordinator",
    "volunteer",
    "mentor",
    "advisor",
  ]);
  const hasResearch = detectKeywordSignal(combinedText, [
    "research",
    "publication",
    "published",
    "journal",
    "conference",
    "paper",
    "study",
    "experiment",
    "lab",
  ]);
  const hasLanguageProof = languages.length > 0 || Boolean(profile.ielts) || Boolean(profile.toefl);

  if (hasExtracurricular) signals.push("Profile includes extracurricular or academic activities");
  if (hasLeadership) signals.push("Leadership or team experience is indicated");
  if (hasResearch) signals.push("Research or publication signals are present");
  if (hasLanguageProof) signals.push("Language proficiency details are provided");

  return {
    interests,
    languages,
    goals,
    hasExtracurricular,
    hasLeadership,
    hasResearch,
    hasLanguageProof,
    signals,
  };
}

function evaluateGpaStrength(gpa) {
  if (gpa == null || Number.isNaN(Number(gpa))) return { value: 0, label: "missing" };
  const value = Number(gpa);
  if (value >= 3.8) return { value: 25, label: "excellent" };
  if (value >= 3.4) return { value: 20, label: "strong" };
  if (value >= 3.0) return { value: 15, label: "moderate" };
  return { value: 8, label: "weak" };
}

function evaluateLanguageStrength(profile) {
  if (profile.ielts != null || profile.toefl != null) {
    return { value: 22, label: "strong" };
  }

  const languages = normalizeList(profile.language_proficiency || profile.languageProficiency || []);
  if (languages.length) {
    return { value: 18, label: "moderate" };
  }

  return { value: 0, label: "missing" };
}

function evaluateExperienceStrength(signals) {
  let value = 0;
  const reasons = [];

  if (signals.hasExtracurricular) {
    value += 18;
    reasons.push("Extracurricular or academic interests are present");
  }
  if (signals.hasLeadership) {
    value += 20;
    reasons.push("Leadership and impact experience detected");
  }
  if (signals.hasResearch) {
    value += 20;
    reasons.push("Research / publication experience detected");
  }
  if (!signals.hasExtracurricular && !signals.hasLeadership && !signals.hasResearch) {
    reasons.push("Limited extracurricular or research detail available");
  }

  return { value: Math.min(value, 60), reasons };
}

function buildProfileStrengthLabel(score) {
  if (score >= 85) return "excellent";
  if (score >= 65) return "strong";
  if (score >= 45) return "moderate";
  return "weak";
}

function evaluateProfileStrength(profile = {}) {
  const gpa = evaluateGpaStrength(profile.gpa);
  const language = evaluateLanguageStrength(profile);
  const signals = collectProfileSignals(profile);
  const experience = evaluateExperienceStrength(signals);

  const score = Math.min(100, gpa.value + language.value + experience.value);
  const label = buildProfileStrengthLabel(score);
  const reasons = [];

  if (gpa.label !== "missing") {
    reasons.push(`GPA strength: ${gpa.label}`);
  } else {
    reasons.push("GPA is not available");
  }

  if (language.label !== "missing") {
    reasons.push(`Language profile: ${language.label}`);
  } else {
    reasons.push("Language proficiency is not provided");
  }

  reasons.push(...experience.reasons.slice(0, 3));

  if (!signals.hasExtracurricular && !signals.hasLeadership && !signals.hasResearch) {
    reasons.push("Add leadership, research, or extracurricular achievements for stronger personalized matches");
  }

  return {
    label,
    score,
    reasons,
  };
}

module.exports = {
  evaluateProfileStrength,
};
