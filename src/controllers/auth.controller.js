const { supabase } = require("../config/supabase");
const jwtService = require("../services/jwt.service");

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { email, password, firstName, lastName, phone, role } = req.body;

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

  // Google OAuth Sign In/Sign Up
  async googleAuth(req, res) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${process.env.CLIENT_URL}/api/auth/google/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.log("Google OAuth URL:", data.url);
      res.json({
        success: true,
        message: "Google OAuth initiated",
        data: {
          url: data.url,
        },
      });
    } catch (error) {
      console.error("Google OAuth error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Backend endpoint: /api/auth/google/callback
 async  googleCallback(req, res) {
  try {
    const { code } = req.query; // Google sends ?code=... on redirect
    console.log("Google OAuth code:", req.query);

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code is missing",
      });
    }

    // Exchange the code for access and refresh tokens via Supabase
    const { data, error } = await supabase.auth.exchangeCodeForSession(code, {
      redirectTo: process.env.CLIENT_URL, // optional: frontend to redirect after login
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const { access_token, refresh_token, user } = data.session;

    // Check if user exists in custom table
    let { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userError && userError.code === "PGRST116") {
      // create user if doesn't exist
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert([
          {
            id: user.id,
            email: user.email,
            firstName: user.user_metadata?.full_name?.split(" ")[0] || "",
            lastName: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            provider: "google",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) {
        return res.status(400).json({ success: false, message: createError.message });
      }

      userData = newUser;
    } else if (userError) {
      return res.status(400).json({ success: false, message: userError.message });
    }

    // Return tokens and user info to frontend
    res.json({
      success: true,
      message: "Google authentication successful",
      data: { user: userData, access_token, refresh_token },
    });
  } catch (err) {
    console.error("Google callback error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}




  // Exchange Google ID token for Supabase session (alternative method)
  async googleSignIn(req, res) {
    try {
      const { id_token, access_token, role = "buyer" } = req.body;

      if (!id_token && !access_token) {
        return res.status(400).json({
          success: false,
          message: "Google ID token or access token is required",
        });
      }

      // Sign in with Google using ID token
      const { data: authData, error: authError } =
        await supabase.auth.signInWithIdToken({
          provider: "google",
          token: id_token,
          access_token: access_token,
        });

      if (authError) {
        return res.status(400).json({
          success: false,
          message: authError.message,
        });
      }

      const user = authData.user;

      // Check if user exists in custom users table
      let { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      // If user doesn't exist, create them
      if (userError && userError.code === "PGRST116") {
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert([
            {
              id: user.id,
              email: user.email,
              firstName:
                user.user_metadata?.full_name?.split(" ")[0] ||
                user.user_metadata?.name ||
                "",
              lastName:
                user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ||
                "",
              phone: user.user_metadata?.phone || "",
              role: role,
              avatar_url:
                user.user_metadata?.avatar_url || user.user_metadata?.picture,
              provider: "google",
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (createError) {
          return res.status(400).json({
            success: false,
            message: createError.message,
          });
        }

        userData = newUser;
      } else if (userError) {
        return res.status(400).json({
          success: false,
          message: userError.message,
        });
      }

      // Use Supabase access token
      const token = authData.session?.access_token;

      res.json({
        success: true,
        message: "Google sign-in successful",
        data: {
          user: userData,
          token,
          refresh_token: authData.session?.refresh_token,
        },
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.refreshSession({
          refresh_token,
        });

      if (sessionError) {
        return res.status(401).json({
          success: false,
          message: sessionError.message,
        });
      }

      // Get updated user data
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", sessionData.user.id)
        .single();

      if (userError) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          user: userData,
          token: sessionData.session?.access_token,
          refresh_token: sessionData.session?.refresh_token,
        },
      });
    } catch (error) {
      console.error("Refresh token error:", error);
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
