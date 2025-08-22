const express = require("express");
const router = express.Router();
const commonController = require("../controllers/common.controller");
const authMiddleware = require("../middleware/auth.middleware");
const {
  validateInterest,
  validateOffer,
  validatePurchase,
} = require("../utils/validation");

// Public routes (no authentication required)
// GET /properties → list all available properties
router.get(
  "/properties",
  authMiddleware.optionalAuth,
  commonController.getAllProperties
);

// GET /properties/search → filter/search properties
router.get(
  "/properties/search",
  authMiddleware.optionalAuth,
  commonController.searchProperties
);

// GET /properties/:id → view a single property's details
router.get(
  "/properties/:id",
  authMiddleware.optionalAuth,
  commonController.getPropertyById
);


module.exports = router;
