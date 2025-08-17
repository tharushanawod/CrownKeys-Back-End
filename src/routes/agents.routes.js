const express = require("express");
const router = express.Router();
const agentsController = require("../controllers/agents.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { validateAgent } = require("../utils/validation");
const upload = require("../services/fileUpload.service");

// @route   GET /api/agents
// @desc    Get all agents
// @access  Public
router.get("/", agentsController.getAllAgents);

// @route   GET /api/agents/:id
// @desc    Get agent by ID
// @access  Public
router.get("/:id", agentsController.getAgentById);

// @route   POST /api/agents
// @desc    Create agent profile
// @access  Private
router.post(
  "/",
  authMiddleware.protect,
  upload.single("profileImage"),
  validateAgent,
  agentsController.createAgent
);

// @route   PUT /api/agents/:id
// @desc    Update agent profile
// @access  Private
router.put(
  "/:id",
  authMiddleware.protect,
  upload.single("profileImage"),
  agentsController.updateAgent
);

// @route   DELETE /api/agents/:id
// @desc    Delete agent profile
// @access  Private
router.delete("/:id", authMiddleware.protect, agentsController.deleteAgent);

// @route   GET /api/agents/:id/listings
// @desc    Get listings by agent
// @access  Public
router.get("/:id/listings", agentsController.getAgentListings);

module.exports = router;
