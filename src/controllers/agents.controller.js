const { supabase } = require("../config/supabase");
const { getFileUrl, deleteFile } = require("../services/fileUpload.service");

class AgentsController {
  // ============================
  // AGENT PROFILE MANAGEMENT
  // ============================

  // Get all agents
  async getAllAgents(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        city,
        state,
        specialty,
        sortBy = "created_at",
        sortOrder = "desc",
      } = req.query;

      const offset = (page - 1) * limit;

      let query = supabase
        .from("agents")
        .select(`
          *,
          users:user_id(first_name, last_name, email, phone)
        `);

      // Apply filters
      if (city) query = query.ilike("city", `%${city}%`);
      if (state) query = query.ilike("state", `%${state}%`);
      if (specialty) query = query.contains("specialties", [specialty]);

      // Apply sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === "asc" })
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
        .select("*", { count: "exact", head: true });

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
      console.error("Get all agents error:", error);
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
        .select(`
          *,
          users:user_id(first_name, last_name, email, phone)
        `)
        .eq("id", id)
        .single();

      if (error || !agent) {
        return res.status(404).json({
          success: false,
          message: "Agent not found",
        });
      }

      res.json({
        success: true,
        data: agent,
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

      // Check if agent profile already exists
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
        profileImageUrl = getFileUrl(req.file.path);
      }

      const newAgent = {
        user_id: userId,
        ...agentData,
        profile_image: profileImageUrl,
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
        // Delete old image if exists
        if (existingAgent.profile_image) {
          const fileName = existingAgent.profile_image.split('/').pop();
          deleteFile(`uploads/${fileName}`);
        }
        profileImageUrl = getFileUrl(req.file.path);
      }

      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.user_id;
      delete updates.created_at;

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

      // Get agent data first to delete associated files
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

      // Delete profile image if exists
      if (existingAgent.profile_image) {
        const fileName = existingAgent.profile_image.split('/').pop();
        deleteFile(`uploads/${fileName}`);
      }

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

  // Get agent's listings
  async getAgentListings(req, res) {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        status = "active",
        property_type,
        sortBy = "created_at",
        sortOrder = "desc",
      } = req.query;

      const offset = (page - 1) * limit;

      let query = supabase
        .from("properties")
        .select("*")
        .eq("agent_id", id);

      // Apply filters
      if (status !== "all") {
        query = query.eq("status", status);
      }
      if (property_type) {
        query = query.eq("property_type", property_type);
      }

      // Apply sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + limit - 1);

      const { data: properties, error } = await query;

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", id);

      res.json({
        success: true,
        data: {
          properties,
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

  // ============================
  // PROPERTY MANAGEMENT (from Owner)
  // ============================

  // Add new property
  async addProperty(req, res) {
    try {
      const agentId = req.user.id; // Agent's user ID
      const {
        location,
        title,
        price,
        size,
        description,
        property_type,
        address,
        city,
        state,
        zip_code,
        bedrooms,
        bathrooms,
        amenities,
        owner_id, // Optional: if agent is listing for someone else
      } = req.body;

      // Handle uploaded photos
      let photoUrls = [];
      if (req.files && req.files.length > 0) {
        photoUrls = req.files.map((file) => getFileUrl(file.path));
      }

      const newProperty = {
        agent_id: agentId,
        owner_id: owner_id || agentId, // If no owner specified, agent is the owner
        title,
        description,
        price: parseFloat(price),
        size: parseFloat(size),
        property_type,
        address,
        city,
        state,
        zip_code,
        location,
        bedrooms: parseInt(bedrooms) || null,
        bathrooms: parseInt(bathrooms) || null,
        amenities: amenities || [],
        photos: photoUrls,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: property, error } = await supabase
        .from("properties")
        .insert([newProperty])
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
        message: "Property added successfully",
        data: property,
      });
    } catch (error) {
      console.error("Add property error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get all properties managed by the agent
  async getMyProperties(req, res) {
    try {
      const agentId = req.user.id;
      const {
        page = 1,
        limit = 10,
        status = "all",
        property_type,
        sortBy = "created_at",
        sortOrder = "desc",
      } = req.query;

      const offset = (page - 1) * limit;

      let query = supabase
        .from("properties")
        .select("*")
        .eq("agent_id", agentId);

      // Apply filters
      if (status !== "all") {
        query = query.eq("status", status);
      }
      if (property_type) {
        query = query.eq("property_type", property_type);
      }

      // Apply sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + limit - 1);

      const { data: properties, error } = await query;

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId);

      res.json({
        success: true,
        data: {
          properties,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get my properties error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get single property by ID (only if managed by agent)
  async getProperty(req, res) {
    try {
      const { id } = req.params;
      const agentId = req.user.id;

      const { data: property, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("agent_id", agentId)
        .single();

      if (error || !property) {
        return res.status(404).json({
          success: false,
          message: "Property not found or unauthorized",
        });
      }

      res.json({
        success: true,
        data: property,
      });
    } catch (error) {
      console.error("Get property error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Edit property details
  async editProperty(req, res) {
    try {
      const { id } = req.params;
      const agentId = req.user.id;
      const updates = req.body;

      // Check if property exists and agent manages it
      const { data: existingProperty, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("agent_id", agentId)
        .single();

      if (fetchError || !existingProperty) {
        return res.status(404).json({
          success: false,
          message: "Property not found or unauthorized",
        });
      }

      // Handle uploaded photos
      let photoUrls = existingProperty.photos || [];
      if (req.files && req.files.length > 0) {
        const newPhotos = req.files.map((file) => getFileUrl(file.path));
        photoUrls = [...photoUrls, ...newPhotos];
      }

      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.agent_id;
      delete updates.created_at;

      // Prepare update data
      const updatedData = {
        ...updates,
        photos: photoUrls,
        updated_at: new Date().toISOString(),
      };

      // Convert numeric fields if provided
      if (updates.price) updatedData.price = parseFloat(updates.price);
      if (updates.size) updatedData.size = parseFloat(updates.size);
      if (updates.bedrooms) updatedData.bedrooms = parseInt(updates.bedrooms);
      if (updates.bathrooms) updatedData.bathrooms = parseInt(updates.bathrooms);

      const { data: property, error } = await supabase
        .from("properties")
        .update(updatedData)
        .eq("id", id)
        .eq("agent_id", agentId)
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
        message: "Property updated successfully",
        data: property,
      });
    } catch (error) {
      console.error("Edit property error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Delete property listing (hard delete)
  async deleteProperty(req, res) {
    try {
      const { id } = req.params;
      const agentId = req.user.id;

      // Get property data first to delete associated files
      const { data: existingProperty, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("agent_id", agentId)
        .single();

      if (fetchError || !existingProperty) {
        return res.status(404).json({
          success: false,
          message: "Property not found or unauthorized",
        });
      }

      // Delete associated photo files
      if (existingProperty.photos && existingProperty.photos.length > 0) {
        existingProperty.photos.forEach((photoUrl) => {
          const fileName = photoUrl.split("/").pop();
          deleteFile(`uploads/${fileName}`);
        });
      }

      const { data: property, error } = await supabase
        .from("properties")
        .delete()
        .eq("id", id)
        .eq("agent_id", agentId)
        .select()
        .single();

      if (error) {
        return res.status(404).json({
          success: false,
          message: "Property not found or unauthorized",
        });
      }

      res.json({
        success: true,
        message: "Property deleted successfully",
      });
    } catch (error) {
      console.error("Delete property error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Disable property listing (soft delete)
  async disableProperty(req, res) {
    try {
      const { id } = req.params;
      const agentId = req.user.id;

      // Check if property exists and agent manages it
      const { data: existingProperty, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("agent_id", agentId)
        .single();

      if (fetchError || !existingProperty) {
        return res.status(404).json({
          success: false,
          message: "Property not found or unauthorized",
        });
      }

      const { data: property, error } = await supabase
        .from("properties")
        .update({
          status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("agent_id", agentId)
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
        message: "Property disabled successfully",
        data: property,
      });
    } catch (error) {
      console.error("Disable property error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Enable property listing
  async enableProperty(req, res) {
    try {
      const { id } = req.params;
      const agentId = req.user.id;

      // Check if property exists and agent manages it
      const { data: existingProperty, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("agent_id", agentId)
        .single();

      if (fetchError || !existingProperty) {
        return res.status(404).json({
          success: false,
          message: "Property not found or unauthorized",
        });
      }

      const { data: property, error } = await supabase
        .from("properties")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("agent_id", agentId)
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
        message: "Property enabled successfully",
        data: property,
      });
    } catch (error) {
      console.error("Enable property error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Remove photos from property
  async removePhotos(req, res) {
    try {
      const { id } = req.params;
      const { photoUrls } = req.body; // Array of photo URLs to remove
      const agentId = req.user.id;

      // Check if property exists and agent manages it
      const { data: existingProperty, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("agent_id", agentId)
        .single();

      if (fetchError || !existingProperty) {
        return res.status(404).json({
          success: false,
          message: "Property not found or unauthorized",
        });
      }

      // Filter out the photos to be removed
      const updatedPhotos = (existingProperty.photos || []).filter(
        (photo) => !photoUrls.includes(photo)
      );

      // Delete the actual files from disk
      photoUrls.forEach((photoUrl) => {
        const fileName = photoUrl.split("/").pop();
        deleteFile(`uploads/${fileName}`);
      });

      const { data: property, error } = await supabase
        .from("properties")
        .update({
          photos: updatedPhotos,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("agent_id", agentId)
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
        message: "Photos removed successfully",
        data: property,
      });
    } catch (error) {
      console.error("Remove photos error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get property statistics for agent
  async getPropertyStats(req, res) {
    try {
      const agentId = req.user.id;

      // Get property counts by status
      const { data: activeProperties, error: activeError } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("status", "active");

      const { data: inactiveProperties, error: inactiveError } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("status", "inactive");

      const { data: soldProperties, error: soldError } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("status", "sold");

      if (activeError || inactiveError || soldError) {
        return res.status(400).json({
          success: false,
          message: "Error fetching statistics",
        });
      }

      // Get total properties
      const { count: totalProperties } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId);

      res.json({
        success: true,
        data: {
          totalProperties,
          activeProperties: activeProperties || 0,
          inactiveProperties: inactiveProperties || 0,
          soldProperties: soldProperties || 0,
        },
      });
    } catch (error) {
      console.error("Get property stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new AgentsController();
