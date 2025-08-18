const { supabase } = require("../config/supabase.js"); // initialized Supabase client
const multer = require("multer");
const { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } = require("../config/env");

// Multer memory storage (store file in memory to send to Supabase)
const storage = multer.memoryStorage();

// File filter for allowed document types
const fileFilter = (req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`
      ),
      false
    );
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
  fileFilter,
});

// Multer error handler
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({
          success: false,
          message: `File too large. Max ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res
        .status(400)
        .json({ success: false, message: "Too many files. Max 10 allowed" });
    }
  }

  if (error.message.includes("Invalid file type")) {
    return res.status(400).json({ success: false, message: error.message });
  }

  next(error);
};

// Upload document to Supabase bucket under user's folder
const uploadDocument = async (file, userId, bucketName) => {
  if (!file) throw new Error("No file provided");

  // Create a unique path: userId/folder-timestamp-originalname
  const uniquePath = `${userId}/${Date.now()}-${file.originalname}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(uniquePath, file.buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.mimetype,
    });

  if (error) throw error;

  return uniquePath;

  // // Get signed URL (temporary private access)
  // const { data: signedUrlData, error: urlError } = await supabase.storage
  //   .from(bucketName)
  //   .createSignedUrl(uniquePath, 60 * 60); // URL valid for 1 hour

  // if (urlError) throw urlError;

  // return signedUrlData.signedUrl; // Return temporary access URL
};

// Delete document from bucket
const deleteDocument = async (filePath, bucketName = "documents") => {
  const { data, error } = await supabase.storage.from(bucketName).remove([filePath]);
  if (error) {
    console.error("Error deleting file:", error);
    return false;
  }
  return true;
};

module.exports = upload;
module.exports.handleMulterError = handleMulterError;
module.exports.uploadDocument = uploadDocument;
module.exports.deleteDocument = deleteDocument;
