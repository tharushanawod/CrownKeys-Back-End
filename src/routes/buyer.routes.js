const express = require("express");
const router = express.Router();
const buyerController = require("../controllers/buyer.controller");
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
  authMiddleware.restrictTo("buyer"),
  buyerController.getAllProperties
);

// GET /properties/search → filter/search properties
router.get(
  "/properties/search",
  authMiddleware.optionalAuth,
  buyerController.searchProperties
);

// GET /properties/:id → view a single property's details
router.get(
  "/properties/:id",
  authMiddleware.optionalAuth,
  buyerController.getPropertyById
);

// Protected routes (authentication required)
// Favorites management
router.post(
  "/buyers/favorites/:propertyId",
  authMiddleware.protect,
  authMiddleware.restrictTo("buyer", "admin"),
  buyerController.addToFavorites
);

router.get(
  "/buyers/favorites",
  authMiddleware.protect,
  authMiddleware.restrictTo("buyer", "admin"),
  buyerController.getFavorites
);

router.delete(
  "/buyers/favorites/:propertyId",
  authMiddleware.protect,
  authMiddleware.restrictTo("buyer", "admin"),
  buyerController.removeFromFavorites
);

// Interest management
router.post(
  "/buyers/interests/:propertyId",
  authMiddleware.protect,
  authMiddleware.restrictTo("buyer", "admin"),
  validateInterest,
  buyerController.expressInterest
);

router.get(
  "/buyers/interests",
  authMiddleware.protect,
  authMiddleware.restrictTo("buyer", "admin"),
  buyerController.getMyInterests
);

// Offer management
router.post(
  "/buyers/offers/:propertyId",
  authMiddleware.protect,
  authMiddleware.restrictTo("buyer", "admin"),
  validateOffer,
  buyerController.placeOffer
);

router.get(
  "/buyers/offers",
  authMiddleware.protect,
  authMiddleware.restrictTo("buyer", "admin"),
  buyerController.getMyOffers
);

// Purchase management
router.post(
  "/buyers/purchase/:propertyId",
  authMiddleware.protect,
  authMiddleware.restrictTo("buyer", "admin"),
  validatePurchase,
  buyerController.initiatePurchase
);

router.get(
  "/buyers/purchases",
  authMiddleware.protect,
  authMiddleware.restrictTo("buyer", "admin"),
  buyerController.getMyPurchases
);

// Dashboard
router.get(
  "/buyers/dashboard",
  authMiddleware.protect,
  authMiddleware.restrictTo("buyer", "admin"),
  buyerController.getDashboard
);

module.exports = router;
