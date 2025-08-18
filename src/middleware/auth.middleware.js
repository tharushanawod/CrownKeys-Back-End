const jwtService = require("../services/jwt.service");
const { supabase } = require("../config/supabase");

class AuthMiddleware {
  // Protect routes - require authentication
  async protect(req, res, next) {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: "Access denied. No token provided.",
        });
      }

      // Extract token from Bearer header
      const token = jwtService.extractTokenFromHeader(authHeader);

      // Verify token using Supabase
      const supabaseUser = await jwtService.verifySupabaseAccessToken(token);

      // Get additional user data from custom users table
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", supabaseUser.id)
        .single();

      if (error || !user) {
        // If user doesn't exist in custom table, create basic user object
        req.user = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          role: "buyer", // Default role
          firstName: supabaseUser.user_metadata?.first_name || "",
          lastName: supabaseUser.user_metadata?.last_name || "",
          phone: supabaseUser.user_metadata?.phone || "",
        };
      } else {
        // Use data from custom users table
        req.user = user;
      }

      // Add Supabase user data for reference
      req.supabaseUser = supabaseUser;
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token.",
      });
    }
  }

  // Check if user has specific role
  restrictTo(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. Authentication required.",
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Insufficient permissions.",
        });
      }

      next();
    };
  }

  // Optional authentication - doesn't fail if no token
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        req.user = null;
        req.supabaseUser = null;
        return next();
      }

      const token = jwtService.extractTokenFromHeader(authHeader);

      // Try to verify Supabase token
      const supabaseUser = await jwtService.verifySupabaseAccessToken(token);

      // Get additional user data from custom users table
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", supabaseUser.id)
        .single();

      if (!error && user) {
        req.user = user;
      } else {
        // Create basic user object from Supabase data
        req.user = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          role: "buyer",
          firstName: supabaseUser.user_metadata?.first_name || "",
          lastName: supabaseUser.user_metadata?.last_name || "",
          phone: supabaseUser.user_metadata?.phone || "",
        };
      }

      req.supabaseUser = supabaseUser;
      next();
    } catch (error) {
      req.user = null;
      req.supabaseUser = null;
      next();
    }
  }

  // Check if user owns the resource
  async checkOwnership(resourceType) {
    return async (req, res, next) => {
      try {
        const { id } = req.params;
        const userId = req.user.id;

        let query;
        switch (resourceType) {
          case "listing":
            query = supabase
              .from("listings")
              .select("user_id")
              .eq("id", id)
              .single();
            break;
          case "agent":
            query = supabase
              .from("agents")
              .select("user_id")
              .eq("id", id)
              .single();
            break;
          default:
            return res.status(400).json({
              success: false,
              message: "Invalid resource type",
            });
        }

        const { data: resource, error } = await query;

        if (error || !resource) {
          return res.status(404).json({
            success: false,
            message: `${resourceType} not found`,
          });
        }

        if (resource.user_id !== userId && req.user.role !== "admin") {
          return res.status(403).json({
            success: false,
            message: "Access denied. You can only access your own resources.",
          });
        }

        next();
      } catch (error) {
        console.error("Ownership check error:", error);
        return res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    };
  }

  // Rate limiting middleware (basic implementation)
  rateLimit(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    const requests = new Map();

    return (req, res, next) => {
      const clientId = req.ip || req.connection.remoteAddress;
      const now = Date.now();

      if (!requests.has(clientId)) {
        requests.set(clientId, []);
      }

      const clientRequests = requests.get(clientId);

      // Remove old requests outside the window
      const validRequests = clientRequests.filter(
        (timestamp) => now - timestamp < windowMs
      );

      if (validRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: "Too many requests. Please try again later.",
        });
      }

      validRequests.push(now);
      requests.set(clientId, validRequests);

      next();
    };
  }
}

module.exports = new AuthMiddleware();
