const { supabase } = require("../config/supabase");
const jwtService = require("../services/jwt.service");

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        role,
      } = req.body;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
            role,
          },
        },
      });

      if (authError) {
        return res.status(400).json({
          success: false,
          message: authError.message,
        });
      }

      // Insert user data into custom users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert([
          {
            id: authData.user.id,
            email,
            firstName: firstName,
            lastName: lastName,
            phone,
            role,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (userError) {
        return res.status(400).json({
          success: false,
          message: userError.message,
        });
      }

      // Generate JWT token
      const token = jwtService.generateToken(userData);
      //added supabase generated jwt token
      // const token = authData.session?.access_token;


      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: userData,
          token,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Sign in with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Get user data from custom users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (userError) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Generate JWT token
      // const token = jwtService.generateToken(userData);
      const token = authData.session?.access_token;

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: userData,
          token,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: userData,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated
      delete updates.id;
      delete updates.email;
      delete updates.created_at;

      const { data: userData, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: userData,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new AuthController();
