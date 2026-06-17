// POST /api/upload — accepts a single "image" file and returns its URL.
exports.uploadImage = (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  return res.status(201).json({ url: `/uploads/${req.file.filename}` });
};

// POST /api/upload/multiple — accepts up to 8 "images" files, returns their URLs.
exports.uploadImages = (req, res) => {
  if (!req.files?.length)
    return res.status(400).json({ message: "No files uploaded" });
  return res
    .status(201)
    .json({ urls: req.files.map((f) => `/uploads/${f.filename}`) });
};
