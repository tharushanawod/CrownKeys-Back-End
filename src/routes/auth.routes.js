const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { validateRegistration, validateLogin } = require("../utils/validation");
const {protect,restrictTo,optionalAuth,checkOwnership,rateLimit } = require("../middleware/auth.middleware");

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", validateRegistration, authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", validateLogin, authController.login);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", authController.logout);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get("/profile",protect,authController.getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put("/profile", authController.updateProfile);

module.exports = router;
