const { supabase } = require("../config/supabase");
const { getFileUrl, deleteFile } = require("../services/fileUpload.service");

class OwnerController {
  // Add new property
  async addProperty(req, res) {
    try {
      const ownerId = req.user.id;
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
      } = req.body;

      // Handle uploaded photos
      let photoUrls = [];
      if (req.files && req.files.length > 0) {
        // Process uploaded files using file upload service
        photoUrls = req.files.map((file) => getFileUrl(file.path));
      }

      const newProperty = {
        owner_id: ownerId,
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

  // Get all properties owned by the user
  async getMyProperties(req, res) {
    try {
      const ownerId = req.user.id;
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
        .eq("owner_id", ownerId);

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
        .eq("owner_id", ownerId);

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

  // Get single property by ID (only if owned by user)
  async getProperty(req, res) {
    try {
      const { id } = req.params;
      const ownerId = req.user.id;

      const { data: property, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("owner_id", ownerId)
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
      const ownerId = req.user.id;
      const updates = req.body;

      // Check if property exists and user owns it
      const { data: existingProperty, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("owner_id", ownerId)
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
      delete updates.owner_id;
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
      if (updates.bathrooms)
        updatedData.bathrooms = parseInt(updates.bathrooms);

      const { data: property, error } = await supabase
        .from("properties")
        .update(updatedData)
        .eq("id", id)
        .eq("owner_id", ownerId)
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
      const ownerId = req.user.id;

      // Get property data first to delete associated files
      const { data: existingProperty, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("owner_id", ownerId)
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
          // Extract file path from URL and delete file
          const fileName = photoUrl.split("/").pop();
          deleteFile(`uploads/${fileName}`);
        });
      }

      const { data: property, error } = await supabase
        .from("properties")
        .delete()
        .eq("id", id)
        .eq("owner_id", ownerId)
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
      const ownerId = req.user.id;

      // Check if property exists and user owns it
      const { data: existingProperty, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("owner_id", ownerId)
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
        .eq("owner_id", ownerId)
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
      const ownerId = req.user.id;

      // Check if property exists and user owns it
      const { data: existingProperty, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("owner_id", ownerId)
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
        .eq("owner_id", ownerId)
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
      const ownerId = req.user.id;

      // Check if property exists and user owns it
      const { data: existingProperty, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("owner_id", ownerId)
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
        .eq("owner_id", ownerId)
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

  // Get property statistics
  async getPropertyStats(req, res) {
    try {
      const ownerId = req.user.id;

      // Get property counts by status
      const { data: activeProperties, error: activeError } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .eq("status", "active");

      const { data: inactiveProperties, error: inactiveError } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .eq("status", "inactive");

      if (activeError || inactiveError) {
        return res.status(400).json({
          success: false,
          message: "Error fetching statistics",
        });
      }

      // Get total properties
      const { count: totalProperties } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", ownerId);

      res.json({
        success: true,
        data: {
          totalProperties,
          activeProperties: activeProperties || 0,
          inactiveProperties: inactiveProperties || 0,
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

module.exports = new OwnerController();
