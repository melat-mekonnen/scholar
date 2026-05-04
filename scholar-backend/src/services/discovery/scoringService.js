function scoreCandidate(candidate) {
  const text = String(candidate?.description || "");
  let domain = "";
  try {
    domain = new URL(candidate?.url || "").hostname.toLowerCase();
  } catch (_err) {
    domain = "";
  }

  const officialDomain = domain.endsWith(".edu") || domain.endsWith(".ac.uk") || domain.endsWith(".edu.et");
  const hasDeadline = Boolean(candidate?.deadline);
  const hasEligibility = /\b(eligibility|eligible|requirements?)\b/i.test(text);
  const hasContact = /\b(contact|email|@)\b/i.test(text);
  const cleanFormatting = text.length > 300 && !/\b(click here now|crypto giveaway|free bonus)\b/i.test(text);

  const score =
    (officialDomain ? 30 : 0) +
    (hasDeadline ? 20 : 0) +
    (hasEligibility ? 20 : 0) +
    (hasContact ? 10 : 0) +
    (cleanFormatting ? 20 : 0);

  return Math.max(0, Math.min(100, score));
}

module.exports = { scoreCandidate };

