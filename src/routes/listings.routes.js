const express = require("express");
const router = express.Router();
const listingsController = require("../controllers/listings.controller");
const authMiddleware = require("../middleware/auth.middleware");
const {
  validateListing,
  validateListingUpdate,
} = require("../utils/validation");
const upload = require("../services/fileUpload.service");

// @route   GET /api/listings
// @desc    Get all listings with filters and pagination
// @access  Public
router.get("/", listingsController.getAllListings);

// @route   GET /api/listings/search
// @desc    Search listings
// @access  Public
router.get("/search", listingsController.searchListings);

// @route   GET /api/listings/:id
// @desc    Get listing by ID
// @access  Public
router.get("/:id", listingsController.getListingById);

// @route   POST /api/listings
// @desc    Create new listing
// @access  Private
router.post(
  "/",
  authMiddleware.protect,
  upload.array("images", 10),
  validateListing,
  listingsController.createListing
);

// @route   PUT /api/listings/:id
// @desc    Update listing
// @access  Private
router.put(
  "/:id",
  authMiddleware.protect,
  upload.array("images", 10),
  validateListingUpdate,
  listingsController.updateListing
);

// @route   DELETE /api/listings/:id
// @desc    Delete listing
// @access  Private
router.delete("/:id", authMiddleware.protect, listingsController.deleteListing);

// @route   GET /api/listings/user/:userId
// @desc    Get listings by user
// @access  Public
router.get("/user/:userId", listingsController.getListingsByUser);

// @route   POST /api/listings/:id/favorite
// @desc    Add listing to favorites
// @access  Private
router.post(
  "/:id/favorite",
  authMiddleware.protect,
  listingsController.toggleFavorite
);

module.exports = router;
