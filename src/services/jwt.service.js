const jwt = require("jsonwebtoken");
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  SUPABASE_JWT_SECRET,
} = require("../config/env");
const { supabase } = require("../config/supabase");

class JWTService {
  // Generate JWT token (for custom auth if needed)
  generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  // Verify Supabase JWT token
  verifySupabaseToken(token) {
    try {
      // Use Supabase JWT secret to verify the token
      const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error("Invalid Supabase token");
    }
  }

  // Verify JWT token (custom tokens)
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  // Get user from Supabase session
  async getUserFromSupabaseToken(token) {
    try {
      // Set the session with the provided token
      const { data, error } = await supabase.auth.getUser(token);

      if (error) {
        throw new Error("Invalid Supabase session");
      }

      return data.user;
    } catch (error) {
      throw new Error("Failed to get user from Supabase token");
    }
  }

  // Verify if token is a valid Supabase access token
  async verifySupabaseAccessToken(token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        throw new Error("Invalid access token");
      }

      return data.user;
    } catch (error) {
      throw new Error("Token verification failed");
    }
  }

  // Decode token without verification (for expired tokens)
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error("Invalid token format");
    }
  }

  // Check if token is expired
  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new Error("Invalid authorization header format");
    }

    return parts[1];
  }

  // Determine token type and verify accordingly
  async verifyAnyToken(token) {
    try {
      // First try to verify as Supabase access token
      const supabaseUser = await this.verifySupabaseAccessToken(token);
      return { type: "supabase", user: supabaseUser };
    } catch (supabaseError) {
      try {
        // Fallback to custom JWT token
        const decoded = this.verifyToken(token);
        return { type: "custom", user: decoded };
      } catch (customError) {
        throw new Error("Invalid token");
      }
    }
  }
}

module.exports = new JWTService();
