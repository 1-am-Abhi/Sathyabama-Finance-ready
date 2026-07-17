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

module.exports = { upload, UPLOAD_DIR };
