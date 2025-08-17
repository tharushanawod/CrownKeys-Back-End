const express = require("express");
const router = express.Router();
const ownerController = require("../controllers/owner.controller");
const authMiddleware = require("../middleware/auth.middleware");
const upload = require("../services/fileUpload.service");

// @route   POST /api/owner/properties
// @desc    Add new property
// @access  Private
router.post(
  "/properties",
  authMiddleware.protect,
  upload.array("photos", 10), // Allow up to 10 photos
  ownerController.addProperty
);

// @route   GET /api/owner/properties
// @desc    Get all properties owned by the user
// @access  Private
router.get(
  "/properties",
  authMiddleware.protect,
  ownerController.getMyProperties
);

// @route   GET /api/owner/properties/:id
// @desc    Get single property by ID (only if owned by user)
// @access  Private
router.get(
  "/properties/:id",
  authMiddleware.protect,
  ownerController.getProperty
);

// @route   PUT /api/owner/properties/:id
// @desc    Edit property details
// @access  Private
router.put(
  "/properties/:id",
  authMiddleware.protect,
  upload.array("photos", 10), // Allow up to 10 additional photos
  ownerController.editProperty
);

// @route   DELETE /api/owner/properties/:id
// @desc    Delete property listing (hard delete)
// @access  Private
router.delete(
  "/properties/:id",
  authMiddleware.protect,
  ownerController.deleteProperty
);

// @route   PATCH /api/owner/properties/:id/disable
// @desc    Disable property listing (soft delete)
// @access  Private
router.patch(
  "/properties/:id/disable",
  authMiddleware.protect,
  ownerController.disableProperty
);

// @route   PATCH /api/owner/properties/:id/enable
// @desc    Enable property listing
// @access  Private
router.patch(
  "/properties/:id/enable",
  authMiddleware.protect,
  ownerController.enableProperty
);

// @route   DELETE /api/owner/properties/:id/photos
// @desc    Remove photos from property
// @access  Private
router.delete(
  "/properties/:id/photos",
  authMiddleware.protect,
  ownerController.removePhotos
);

// @route   GET /api/owner/stats
// @desc    Get property statistics
// @access  Private
router.get("/stats", authMiddleware.protect, ownerController.getPropertyStats);

module.exports = router;
