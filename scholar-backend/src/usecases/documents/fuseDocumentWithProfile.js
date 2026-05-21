const fs = require("fs");
const path = require("path");

const DEGREE_LABELS = {
  high_school: "High School",
  bachelor: "Bachelor's Degree",
  master: "Master's Degree",
  phd: "PhD",
};

/**
 * Replace common bracket placeholders with profile + user fields.
 */
function fuseTemplateContent(content, { user, profile }) {
  const fullName = (user?.fullName || user?.full_name || "[Your Full Name]").trim();
  const email = (user?.email || "[Professional email]").trim();
  const field = profile?.field_of_study || profile?.fieldOfStudy || "[Field of study]";
  const gpa = profile?.gpa != null ? String(profile.gpa) : "[GPA]";
  const degree =
    DEGREE_LABELS[profile?.degree_level || profile?.degreeLevel] || "[Degree level]";
  const country =
    profile?.preferred_country || profile?.preferredCountry || "[Country]";
  const interests = Array.isArray(profile?.interests)
    ? profile.interests.join(", ")
    : "[Interests]";

  const oneLineProfile = profile
    ? `${degree} student in ${field} with interests in ${interests}. Targeting opportunities in ${country}. GPA: ${gpa}.`
    : "[2–3 sentences: your field, current stage, key strengths, and what you aim to study or research.]";

  const replacements = [
    [/\[Your Full Name\]/gi, fullName],
    [/\[Full Name\]/gi, fullName],
    [/\[Professional email\]/gi, email],
    [/\[Email\]/gi, email],
    [/\[Field of study\]/gi, field],
    [/\[Degree and field\]/gi, `${degree}, ${field}`],
    [/\[Degree level\]/gi, degree],
    [/\[Country\]/gi, country],
    [/\[City, Country\]/gi, country],
    [/\[GPA\]/gi, gpa],
    [/\[Interests\]/gi, interests],
    [
      /\[2–3 sentences:[^\]]*\]/gi,
      oneLineProfile,
    ],
    [
      /\[2-3 sentences:[^\]]*\]/gi,
      oneLineProfile,
    ],
  ];

  let out = content;
  for (const [pattern, value] of replacements) {
    out = out.replace(pattern, value);
  }
  return out;
}

function readTextFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    const err = new Error("Document file is missing on server");
    err.statusCode = 404;
    throw err;
  }
  return fs.readFileSync(absolutePath, "utf8");
}

module.exports = { fuseTemplateContent, readTextFile };
