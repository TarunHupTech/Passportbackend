const path = require("path");
const fs = require("fs");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;
const isProd = process.env.NODE_ENV === "production";

// In production S3 is mandatory — fail at boot rather than silently writing to
// a disk that disappears when the instance is replaced.
if (isProd && (!BUCKET || !REGION)) {
  throw new Error(
    "S3 is not configured — set S3_BUCKET and AWS_REGION in the environment."
  );
}

// uploads/<slug>-<timestamp>-<random><ext> — unguessable, so object URLs can't
// be enumerated.
const buildName = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const base = path
    .basename(file.originalname, ext)
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .slice(0, 32);
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${base || "item"}-${unique}${ext}`;
};

let storage;

if (BUCKET && REGION) {
  // Credentials resolve automatically: the EC2 instance's IAM role in
  // production, or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY locally.
  const s3 = new S3Client({ region: REGION });
  storage = multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE, // so browsers render, not download
    cacheControl: "public, max-age=31536000, immutable",
    key: (req, file, cb) => cb(null, `uploads/${buildName(file)}`),
  });
} else {
  // Local development only.
  const uploadDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, buildName(file)),
  });
  console.warn("[upload] S3 not configured — using local disk (development only).");
}

const fileFilter = (req, file, cb) => {
  if (/^image\/(jpe?g|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});

module.exports = upload;
