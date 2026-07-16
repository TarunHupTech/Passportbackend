// On S3, multer-s3 sets `location` to the object's public URL — we store that
// absolute URL and the client's imageUrl() passes any `http…` value straight
// through. On the local-disk dev fallback there's no `location`, so build the
// relative /uploads path instead.
const fileUrl = (f) => f.location || `/uploads/${f.filename}`;

// POST /api/upload — accepts a single "image" file and returns its URL.
exports.uploadImage = (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  return res.status(201).json({ url: fileUrl(req.file) });
};

// POST /api/upload/multiple — accepts up to 8 "images" files, returns their URLs.
exports.uploadImages = (req, res) => {
  if (!req.files?.length)
    return res.status(400).json({ message: "No files uploaded" });
  return res.status(201).json({ urls: req.files.map(fileUrl) });
};
