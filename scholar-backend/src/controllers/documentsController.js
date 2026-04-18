const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { DocumentRepository } = require("../repositories/DocumentRepository");

const repo = new DocumentRepository();

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".txt"]);

function ensureUploadsDir() {
  const dir = path.resolve(process.cwd(), "uploads", "documents");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseOptionalScholarshipId(value) {
  if (value == null || value === "") return null;
  if (!UUID_V4.test(String(value))) {
    const err = new Error("Invalid scholarship id");
    err.statusCode = 400;
    throw err;
  }
  return String(value);
}

async function upload(req, res, next) {
  try {
    const role = req.user?.role;
    const userId = req.user?.id;
    const title = String(req.body?.title || "").trim();
    const type = String(req.body?.type || "").trim();
    const scholarshipId = parseOptionalScholarshipId(req.body?.scholarshipId);
    const file = req.file;

    if (!title) {
      const err = new Error("Title is required");
      err.statusCode = 400;
      throw err;
    }
    if (!type) {
      const err = new Error("Document type is required");
      err.statusCode = 400;
      throw err;
    }
    if (!file) {
      const err = new Error("File is required");
      err.statusCode = 400;
      throw err;
    }

    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      fs.unlink(file.path, () => {});
      const err = new Error("Unsupported file type");
      err.statusCode = 400;
      throw err;
    }

    if (role === "manager" || role === "owner") {
      if (!scholarshipId) {
        fs.unlink(file.path, () => {});
        const err = new Error("Managers and owners must provide scholarshipId for document upload");
        err.statusCode = 400;
        throw err;
      }
      const owns = await repo.isScholarshipOwnedByManager(scholarshipId, userId);
      if (!owns) {
        fs.unlink(file.path, () => {});
        const err = new Error("You can only upload documents for your own scholarships");
        err.statusCode = 403;
        throw err;
      }
    }

    const created = await repo.create({
      id: randomUUID(),
      title,
      type,
      filePath: file.path,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size || 0,
      scholarshipId,
      uploadedByUserId: userId,
    });

    return res.status(201).json({
      id: created.id,
      title: created.title,
      type: created.type,
      originalName: created.original_name,
      mimeType: created.mime_type,
      fileSize: Number(created.file_size || 0),
      scholarshipId: created.scholarship_id,
      uploadedByUserId: created.uploaded_by_user_id,
      downloadCount: Number(created.download_count || 0),
      createdAt: created.created_at,
    });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const rows = await repo.list({
      q: req.query?.q ? String(req.query.q) : null,
      type: req.query?.type ? String(req.query.type) : null,
      scholarshipId: parseOptionalScholarshipId(req.query?.scholarshipId),
      uploadedByUserId: parseOptionalScholarshipId(req.query?.uploadedByUserId),
    });

    return res.json({
      documents: rows.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        originalName: d.original_name,
        mimeType: d.mime_type,
        fileSize: Number(d.file_size || 0),
        scholarshipId: d.scholarship_id,
        uploadedByUserId: d.uploaded_by_user_id,
        uploadedByName: d.uploaded_by_name,
        downloadCount: Number(d.download_count || 0),
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const id = String(req.params?.id || "");
    if (!UUID_V4.test(id)) {
      const err = new Error("Invalid document id");
      err.statusCode = 400;
      throw err;
    }
    const d = await repo.findById(id);
    if (!d) {
      const err = new Error("Document not found");
      err.statusCode = 404;
      throw err;
    }
    return res.json({
      id: d.id,
      title: d.title,
      type: d.type,
      originalName: d.original_name,
      mimeType: d.mime_type,
      fileSize: Number(d.file_size || 0),
      scholarshipId: d.scholarship_id,
      uploadedByUserId: d.uploaded_by_user_id,
      uploadedByName: d.uploaded_by_name,
      downloadCount: Number(d.download_count || 0),
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    });
  } catch (err) {
    return next(err);
  }
}

async function download(req, res, next) {
  try {
    const id = String(req.params?.id || "");
    if (!UUID_V4.test(id)) {
      const err = new Error("Invalid document id");
      err.statusCode = 400;
      throw err;
    }
    const d = await repo.findById(id);
    if (!d) {
      const err = new Error("Document not found");
      err.statusCode = 404;
      throw err;
    }

    const absolutePath = path.resolve(d.file_path);
    if (!fs.existsSync(absolutePath)) {
      const err = new Error("Document file is missing on server");
      err.statusCode = 404;
      throw err;
    }

    await repo.incrementDownloadCount(id);
    return res.download(absolutePath, d.original_name);
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = String(req.params?.id || "");
    if (!UUID_V4.test(id)) {
      const err = new Error("Invalid document id");
      err.statusCode = 400;
      throw err;
    }
    const existing = await repo.findById(id);
    if (!existing) {
      const err = new Error("Document not found");
      err.statusCode = 404;
      throw err;
    }

    const role = req.user?.role;
    const userId = req.user?.id;
    if (role !== "admin" && existing.uploaded_by_user_id !== userId) {
      const err = new Error("You can only update documents uploaded by you");
      err.statusCode = 403;
      throw err;
    }

    const title = req.body?.title ? String(req.body.title).trim() : null;
    const type = req.body?.type ? String(req.body.type).trim() : null;
    const updated = await repo.update(id, { title, type });

    return res.json({
      id: updated.id,
      title: updated.title,
      type: updated.type,
      originalName: updated.original_name,
      mimeType: updated.mime_type,
      fileSize: Number(updated.file_size || 0),
      scholarshipId: updated.scholarship_id,
      uploadedByUserId: updated.uploaded_by_user_id,
      downloadCount: Number(updated.download_count || 0),
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = String(req.params?.id || "");
    if (!UUID_V4.test(id)) {
      const err = new Error("Invalid document id");
      err.statusCode = 400;
      throw err;
    }
    const existing = await repo.findById(id);
    if (!existing) {
      const err = new Error("Document not found");
      err.statusCode = 404;
      throw err;
    }

    const role = req.user?.role;
    const userId = req.user?.id;
    if (role !== "admin" && existing.uploaded_by_user_id !== userId) {
      const err = new Error("You can only delete documents uploaded by you");
      err.statusCode = 403;
      throw err;
    }

    const deleted = await repo.delete(id);
    if (deleted?.file_path) {
      fs.unlink(path.resolve(deleted.file_path), () => {});
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  ensureUploadsDir,
  upload,
  list,
  getById,
  download,
  update,
  remove,
};

