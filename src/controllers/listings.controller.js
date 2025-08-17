const { supabase } = require("../config/supabase");

class ListingsController {
  // Get all listings with filters and pagination
  async getAllListings(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        minPrice,
        maxPrice,
        bedrooms,
        bathrooms,
        city,
        state,
        sortBy = "created_at",
        sortOrder = "desc",
      } = req.query;

      const offset = (page - 1) * limit;

      let query = supabase
        .from("listings")
        .select(
          `
          *,
          users:user_id(first_name, last_name, email, phone),
          agents:agent_id(*)
        `
        )
        .eq("status", "active");

      // Apply filters
      if (type) query = query.eq("type", type);
      if (minPrice) query = query.gte("price", minPrice);
      if (maxPrice) query = query.lte("price", maxPrice);
      if (bedrooms) query = query.eq("bedrooms", bedrooms);
      if (bathrooms) query = query.gte("bathrooms", bathrooms);
      if (city) query = query.ilike("city", `%${city}%`);
      if (state) query = query.ilike("state", `%${state}%`);

      // Apply sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + limit - 1);

      const { data: listings, error, count } = await query;

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
        .eq("status", "active");

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
      console.error("Get listings error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Search listings
  async searchListings(req, res) {
    try {
      const { q, ...filters } = req.query;

      let query = supabase
        .from("listings")
        .select(
          `
          *,
          users:user_id(first_name, last_name, email, phone),
          agents:agent_id(*)
        `
        )
        .eq("status", "active");

      if (q) {
        query = query.or(
          `title.ilike.%${q}%,description.ilike.%${q}%,address.ilike.%${q}%,city.ilike.%${q}%`
        );
      }

      const { data: listings, error } = await query;

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.json({
        success: true,
        data: listings,
      });
    } catch (error) {
      console.error("Search listings error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get listing by ID
  async getListingById(req, res) {
    try {
      const { id } = req.params;

      const { data: listing, error } = await supabase
        .from("listings")
        .select(
          `
          *,
          users:user_id(first_name, last_name, email, phone),
          agents:agent_id(*)
        `
        )
        .eq("id", id)
        .single();

      if (error || !listing) {
        return res.status(404).json({
          success: false,
          message: "Listing not found",
        });
      }

      // Increment view count
      await supabase
        .from("listings")
        .update({ views: (listing.views || 0) + 1 })
        .eq("id", id);

      res.json({
        success: true,
        data: listing,
      });
    } catch (error) {
      console.error("Get listing error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Create new listing
  async createListing(req, res) {
    try {
      const userId = req.user.id;
      const listingData = req.body;

      // Handle uploaded images
      let imageUrls = [];
      if (req.files && req.files.length > 0) {
        // Process uploaded files (implement file upload logic)
        imageUrls = req.files.map((file) => file.path);
      }

      const newListing = {
        ...listingData,
        user_id: userId,
        images: imageUrls,
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: listing, error } = await supabase
        .from("listings")
        .insert([newListing])
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
        message: "Listing created successfully",
        data: listing,
      });
    } catch (error) {
      console.error("Create listing error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Update listing
  async updateListing(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      // Check if listing exists and user owns it
      const { data: existingListing, error: fetchError } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (fetchError || !existingListing) {
        return res.status(404).json({
          success: false,
          message: "Listing not found or unauthorized",
        });
      }

      // Handle uploaded images
      let imageUrls = existingListing.images || [];
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file) => file.path);
        imageUrls = [...imageUrls, ...newImages];
      }

      const updatedData = {
        ...updates,
        images: imageUrls,
        updated_at: new Date().toISOString(),
      };

      const { data: listing, error } = await supabase
        .from("listings")
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
        message: "Listing updated successfully",
        data: listing,
      });
    } catch (error) {
      console.error("Update listing error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Delete listing
  async deleteListing(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { data: listing, error } = await supabase
        .from("listings")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        return res.status(404).json({
          success: false,
          message: "Listing not found or unauthorized",
        });
      }

      res.json({
        success: true,
        message: "Listing deleted successfully",
      });
    } catch (error) {
      console.error("Delete listing error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get listings by user
  async getListingsByUser(req, res) {
    try {
      const { userId } = req.params;

      const { data: listings, error } = await supabase
        .from("listings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.json({
        success: true,
        data: listings,
      });
    } catch (error) {
      console.error("Get user listings error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Toggle favorite listing
  async toggleFavorite(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if already favorited
      const { data: existingFavorite } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", userId)
        .eq("listing_id", id)
        .single();

      if (existingFavorite) {
        // Remove from favorites
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("listing_id", id);

        res.json({
          success: true,
          message: "Removed from favorites",
          data: { favorited: false },
        });
      } else {
        // Add to favorites
        await supabase.from("favorites").insert([
          {
            user_id: userId,
            listing_id: id,
            created_at: new Date().toISOString(),
          },
        ]);

        res.json({
          success: true,
          message: "Added to favorites",
          data: { favorited: true },
        });
      }
    } catch (error) {
      console.error("Toggle favorite error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new ListingsController();
