const { BookmarkRepository } = require("../repositories/BookmarkRepository");
const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");

const bookmarkRepo = new BookmarkRepository();
const scholarshipRepo = new ScholarshipRepository();

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapScholarshipRow(r) {
  return {
    id: r.id,
    title: r.title,
    country: r.country,
    degreeLevel: r.degree_level,
    fieldOfStudy: r.field_of_study,
    fundingType: r.funding_type,
    deadline: r.deadline,
    amount: r.amount,
    description: r.description,
    applicationUrl: r.application_url,
    createdAt: r.created_at,
    bookmarkedAt: r.bookmarked_at,
  };
}

async function addBookmark(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !UUID_V4.test(id)) {
      const err = new Error("Invalid scholarship id");
      err.statusCode = 400;
      throw err;
    }

    const exists = await scholarshipRepo.findPublicById(id);
    if (!exists) {
      const err = new Error("Scholarship not found");
      err.statusCode = 404;
      throw err;
    }

    try {
      await bookmarkRepo.create(req.user.id, id);
    } catch (e) {
      if (e.code === "23505") {
        return res.status(409).json({ message: "Scholarship is already bookmarked" });
      }
      throw e;
    }

    return res.status(201).json({ message: "Bookmarked" });
  } catch (err) {
    return next(err);
  }
}

async function removeBookmark(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !UUID_V4.test(id)) {
      const err = new Error("Invalid scholarship id");
      err.statusCode = 400;
      throw err;
    }

    const deleted = await bookmarkRepo.remove(req.user.id, id);
    if (!deleted) {
      const err = new Error("Bookmark not found");
      err.statusCode = 404;
      throw err;
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function listBookmarks(req, res, next) {
  try {
    const { page = "1", limit = "12" } = req.query;
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);

    const { rows, total, page: p, limit: l } = await bookmarkRepo.listByUser(
      req.user.id,
      parsedPage,
      parsedLimit
    );

    const scholarships = rows.map(mapScholarshipRow);

    return res.json({
      results: scholarships,
      scholarships,
      total,
      page: p,
      limit: l,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  addBookmark,
  removeBookmark,
  listBookmarks,
};
