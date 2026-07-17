const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Absolute uploads directory — must match the static mount in app.js
// (path.join(__dirname, '..', 'uploads')). Using an absolute path makes uploads
// work regardless of the process CWD.
//
// CRITICAL: `uploads/` is gitignored, so on a fresh clone or an ephemeral
// filesystem (e.g. Render) the directory does not exist. multer's disk storage
// throws ENOENT when the destination is missing, which surfaced as a 500 on
// every proof upload. Create it eagerly at module load AND defensively per
// request.
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

const ensureUploadDir = () => {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (e) {
    // Surfaced by the route; never crash the process here.
  }
};

ensureUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safe = String(file.originalname || "file")
      .replace(/[^\w.\-]+/g, "_")
      .slice(-80);
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB per file
});

// Persist just-uploaded files into Postgres so they survive Render's ephemeral
// filesystem (fixes GET /uploads/<file> → 404 after redeploy). Place this
// immediately after upload.single()/upload.fields(). Failure to persist never
// blocks the upload — the file still exists on local disk for the current
// instance and the request succeeds.
const persistUploads = async (req, res, next) => {
  try {
    const { UploadedFile } = require('../models');
    const collected = [];
    if (req.file) collected.push(req.file);
    if (Array.isArray(req.files)) collected.push(...req.files);
    else if (req.files && typeof req.files === 'object') {
      for (const key of Object.keys(req.files)) {
        const v = req.files[key];
        if (Array.isArray(v)) collected.push(...v);
      }
    }
    for (const f of collected) {
      if (!f || !f.filename) continue;
      let buffer = f.buffer;
      if (!buffer && f.path) {
        try { buffer = fs.readFileSync(f.path); } catch (e) { continue; }
      }
      if (!buffer) continue;
      await UploadedFile.upsert({
        filename: f.filename,
        mimetype: f.mimetype || null,
        size: f.size || buffer.length,
        data: buffer,
      });
    }
  } catch (e) {
    // Never fail the upload on a persistence hiccup; the record is still on disk.
    try { require('../utils/logger').warn('[persistUploads] failed:', e.message); } catch (_) {}
  }
  next();
};

module.exports = { upload, persistUploads, UPLOAD_DIR };
