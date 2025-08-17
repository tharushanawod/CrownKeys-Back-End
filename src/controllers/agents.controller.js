const { supabase } = require("../config/supabase");

class AgentsController {
  // Get all agents
  async getAllAgents(req, res) {
    try {
      const { page = 1, limit = 10, city, state } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("agents")
        .select(
          `
          *,
          users:user_id(first_name, last_name, email, phone)
        `
        )
        .eq("status", "active");

      // Apply filters
      if (city) query = query.ilike("city", `%${city}%`);
      if (state) query = query.ilike("state", `%${state}%`);

      // Apply pagination
      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: agents, error } = await query;

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from("agents")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      res.json({
        success: true,
        data: {
          agents,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get agents error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get agent by ID
  async getAgentById(req, res) {
    try {
      const { id } = req.params;

      const { data: agent, error } = await supabase
        .from("agents")
        .select(
          `
          *,
          users:user_id(first_name, last_name, email, phone)
        `
        )
        .eq("id", id)
        .single();

      if (error || !agent) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      // Get agent's listings count
      const { count: listingsCount } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", id)
        .eq("status", "active");

      res.json({
        success: true,
        data: {
          ...agent,
          listings_count: listingsCount,
        },
      });
    } catch (error) {
      console.error("Get agent error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Create agent profile
  async createAgent(req, res) {
    try {
      const userId = req.user.id;
      const agentData = req.body;

      // Check if user already has an agent profile
      const { data: existingAgent } = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (existingAgent) {
        return res.status(400).json({
          success: false,
          message: "Agent profile already exists",
        });
      }

      // Handle uploaded profile image
      let profileImageUrl = null;
      if (req.file) {
        profileImageUrl = req.file.path;
      }

      const newAgent = {
        ...agentData,
        user_id: userId,
        profile_image: profileImageUrl,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: agent, error } = await supabase
        .from("agents")
        .insert([newAgent])
        .select()
        .single();

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(201).json({
        success: true,
        message: "Agent profile created successfully",
        data: agent,
      });
    } catch (error) {
      console.error("Create agent error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update agent profile
  async updateAgent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      // Check if agent exists and user owns it
      const { data: existingAgent, error: fetchError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (fetchError || !existingAgent) {
        return res.status(404).json({
          success: false,
          message: "Agent profile not found or unauthorized",
        });
      }

      // Handle uploaded profile image
      let profileImageUrl = existingAgent.profile_image;
      if (req.file) {
        profileImageUrl = req.file.path;
      }

      const updatedData = {
        ...updates,
        profile_image: profileImageUrl,
        updated_at: new Date().toISOString(),
      };

      const { data: agent, error } = await supabase
        .from("agents")
        .update(updatedData)
        .eq("id", id)
        .eq("user_id", userId)
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
        message: "Agent profile updated successfully",
        data: agent,
      });
    } catch (error) {
      console.error("Update agent error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Delete agent profile
  async deleteAgent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { data: agent, error } = await supabase
        .from("agents")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        return res.status(404).json({
          success: false,
          message: "Agent profile not found or unauthorized",
        });
      }

      res.json({
        success: true,
        message: "Agent profile deleted successfully",
      });
    } catch (error) {
      console.error("Delete agent error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get listings by agent
  async getAgentListings(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, status = "active" } = req.query;
      const offset = (page - 1) * limit;

      const { data: listings, error } = await supabase
        .from("listings")
        .select("*")
        .eq("agent_id", id)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", id)
        .eq("status", status);

      res.json({
        success: true,
        data: {
          listings,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get agent listings error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new AgentsController();
