const { StudentProfileRepository } = require("../repositories/StudentProfileRepository");
const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");

const profileRepo = new StudentProfileRepository();
const scholarshipRepo = new ScholarshipRepository();

async function profileSuggestions(req, res, next) {
  try {
    const profile = await profileRepo.findByUserId(req.user.id);
    if (!profile) {
      return res.json({
        suggestions: [
          "Complete your profile with degree level, field of study, and language proficiency.",
          "Add your academic goals and funding preferences to improve AI insights.",
        ],
      });
    }

    const suggestions = [];
    if (!profile.field_of_study) {
      suggestions.push("Add your field of study so recommendations better match your academic goals.");
    }
    if (!profile.degree_level) {
      suggestions.push("Specify your degree level so scholarship matches are more accurate.");
    }
    if (!profile.gpa) {
      suggestions.push("Share your GPA if available to receive stronger application guidance.");
    }
    if (!profile.language_proficiency || profile.language_proficiency.length === 0) {
      suggestions.push("Add your language proficiency tests (IELTS/TOEFL) for more relevant eligibility scoring.");
    }
    if (!profile.goals) {
      suggestions.push("Describe your academic or career goals to unlock premium profile improvement tips.");
    }

    return res.json({ suggestions });
  } catch (err) {
    return next(err);
  }
}

async function applicationAdvice(req, res, next) {
  try {
    const profile = await profileRepo.findByUserId(req.user.id);
    const advice = [
      "Focus your application on why this scholarship aligns with your academic goals.",
      "Highlight any leadership, community service, or research experience.",
      "If the award is fully funded, emphasize how it enables your studies and long-term impact.",
    ];

    if (profile?.field_of_study) {
      advice.unshift(`Use examples from your ${profile.field_of_study} experience when describing your fit.`);
    }

    return res.json({ advice });
  } catch (err) {
    return next(err);
  }
}

async function earlyAlerts(req, res, next) {
  try {
    const scholarships = await scholarshipRepo.findUrgentScholarships({ limit: 6 });
    const alerts = scholarships.map((s) => ({
      id: s.id,
      title: s.title,
      organizationName: s.organization_name,
      deadline: s.deadline,
      country: s.country,
      degreeLevel: s.degree_level,
      applicationUrl: s.application_url,
    }));
    return res.json({ alerts });
  } catch (err) {
    return next(err);
  }
}

module.exports = { profileSuggestions, applicationAdvice, earlyAlerts };
