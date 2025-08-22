const { supabase } = require("../config/supabase");
const {
  SUPABASE_URL
} = require("../config/env");

class BuyerController {
  // GET /properties → list all available properties
  async getAllProperties(req, res) {
    try {
      const {
        page = 1,
        limit = 12,
        city,
        state,
        property_type,
        price_min,
        price_max,
        size_min,
        size_max,
        bedrooms,
        bathrooms,
        sortBy = "created_at",
        sortOrder = "desc",
        search,
      } = req.query;

      const offset = (page - 1) * limit;

      let query = supabase
        .from("properties")
        .select("*")
        .eq("status", "active");

      // Apply filters
      if (city) {
        query = query.ilike("city", `%${city}%`);
      }
      if (state) {
        query = query.ilike("state", `%${state}%`);
      }
      if (property_type) {
        query = query.eq("property_type", property_type);
      }
      if (price_min) {
        query = query.gte("price", parseFloat(price_min));
      }
      if (price_max) {
        query = query.lte("price", parseFloat(price_max));
      }
      if (size_min) {
        query = query.gte("size", parseFloat(size_min));
      }
      if (size_max) {
        query = query.lte("size", parseFloat(size_max));
      }
      if (bedrooms) {
        query = query.eq("bedrooms", parseInt(bedrooms));
      }
      if (bathrooms) {
        query = query.gte("bathrooms", parseFloat(bathrooms));
      }
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%,address.ilike.%${search}%`
        );
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
      let countQuery = supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Apply same filters for count
      if (city) countQuery = countQuery.ilike("city", `%${city}%`);
      if (state) countQuery = countQuery.ilike("state", `%${state}%`);
      if (property_type)
        countQuery = countQuery.eq("property_type", property_type);
      if (price_min)
        countQuery = countQuery.gte("price", parseFloat(price_min));
      if (price_max)
        countQuery = countQuery.lte("price", parseFloat(price_max));
      if (size_min) countQuery = countQuery.gte("size", parseFloat(size_min));
      if (size_max) countQuery = countQuery.lte("size", parseFloat(size_max));
      if (bedrooms) countQuery = countQuery.eq("bedrooms", parseInt(bedrooms));
      if (bathrooms)
        countQuery = countQuery.gte("bathrooms", parseFloat(bathrooms));
      if (search) {
        countQuery = countQuery.or(
          `title.ilike.%${search}%,description.ilike.%${search}%,address.ilike.%${search}%`
        );
      }

      const { count: totalCount } = await countQuery;

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
      console.error("Get all properties error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET /properties/:id → view a single property's details
  async getPropertyById(req, res) {
    try {
      const { id } = req.params;

      const { data: property, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .single();

      if (error || !property) {
        return res.status(404).json({
          success: false,
          message: "Property not found or not available",
        });
      }

      // Get owner details (optional, for contact information)
      const { data: owner } = await supabase
        .from("users")
        .select("id, firstName, lastName, email, phone")
        .eq("id", property.owner_id)
        .single();

      res.json({
        success: true,
        data: {
          ...property,
          owner: owner || null,
        },
      });
    } catch (error) {
      console.error("Get property by ID error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET /properties/search → filter/search properties (same as getAllProperties but with different endpoint)
  async searchProperties(req, res) {
    // This uses the same logic as getAllProperties
    try {
      return this.getAllProperties(req, res);
    } catch (error) {
      console.error("Search properties error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // POST /buyers/favorites/:propertyId → add property to favorites
  async addToFavorites(req, res) {
    try {
      const { propertyId } = req.params;
      const buyerId = req.user.id;

      // Check if property exists and is active
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("status", "active")
        .single();

      if (propertyError || !property) {
        return res.status(404).json({
          success: false,
          message: "Property not found or not available",
        });
      }

      // Check if already in favorites
      const { data: existingFavorite } = await supabase
        .from("favorites")
        .select("id")
        .eq("buyer_id", buyerId)
        .eq("property_id", propertyId)
        .single();

      if (existingFavorite) {
        return res.status(400).json({
          success: false,
          message: "Property already in favorites",
        });
      }

      // Add to favorites
      const { data: favorite, error } = await supabase
        .from("favorites")
        .insert([
          {
            buyer_id: buyerId,
            property_id: propertyId,
          },
        ])
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
        message: "Property added to favorites successfully",
        data: favorite,
      });
    } catch (error) {
      console.error("Add to favorites error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET /buyers/favorites → list favorite properties
  async getFavorites(req, res) {
    try {
      const buyerId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      // Fetch favorites and related properties
      const { data: favorites, error } = await supabase
        .from("favorites")
        .select(
          `
        id,
        created_at,
        properties:property_id (*)
      `
        )
        .eq("buyer_id", buyerId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // Map each favorite to include public image URLs
      const favoritesWithImages = favorites.map((favorite) => {
        const property = favorite.properties;

        // Convert property.photos array to full public URLs
        const photos =
          property.photos?.map(
            (filename) =>
              `${SUPABASE_URL}/storage/v1/object/public/Crown-Keys/${filename}`
          ) || [];

        return {
          ...favorite,
          properties: {
            ...property,
            photos, // array of full public URLs
          },
        };
      });

      // Get total count for pagination
      const { count: totalCount } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", buyerId);

      res.json({
        success: true,
        data: {
          favorites: favoritesWithImages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // DELETE /buyers/favorites/:propertyId → remove from favorites
  async removeFromFavorites(req, res) {
    try {
      const { propertyId } = req.params;
      const buyerId = req.user.id;

      const { data: favorite, error } = await supabase
        .from("favorites")
        .delete()
        .eq("buyer_id", buyerId)
        .eq("property_id", propertyId)
        .select()
        .single();

      if (error || !favorite) {
        return res.status(404).json({
          success: false,
          message: "Favorite not found",
        });
      }

      res.json({
        success: true,
        message: "Property removed from favorites successfully",
      });
    } catch (error) {
      console.error("Remove from favorites error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // POST /buyers/interests/:propertyId → express interest / request visit
  async expressInterest(req, res) {
    try {
      const { propertyId } = req.params;
      const buyerId = req.user.id;
      const { message, preferred_date, contact_method = "email" } = req.body;

      // Check if property exists and is active
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("id, owner_id, title")
        .eq("id", propertyId)
        .eq("status", "active")
        .single();

      if (propertyError || !property) {
        return res.status(404).json({
          success: false,
          message: "Property not found or not available",
        });
      }

      // Check if interest already expressed
      const { data: existingInterest } = await supabase
        .from("interests")
        .select("id")
        .eq("buyer_id", buyerId)
        .eq("property_id", propertyId)
        .single();

      if (existingInterest) {
        return res.status(400).json({
          success: false,
          message: "Interest already expressed for this property",
        });
      }

      // Create interest record
      const { data: interest, error } = await supabase
        .from("interests")
        .insert([
          {
            buyer_id: buyerId,
            property_id: propertyId,
            // owner_id: property.owner_id,
            message: message || "I am interested in this property",
            preferred_date,
            contact_method,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ])
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
        message: "Interest expressed successfully",
        data: interest,
      });
    } catch (error) {
      console.error("Express interest error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // POST /buyers/offers/:propertyId → place an offer for a property
  async placeOffer(req, res) {
    try {
      const { propertyId } = req.params;
      const buyerId = req.user.id;
      const {
        offer_amount,
        message,
        offer_type = "purchase",
        contingencies = [],
        closing_date,
        earnest_money,
      } = req.body;

      // Validate offer amount
      if (!offer_amount || offer_amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid offer amount is required",
        });
      }

      // Check if property exists and is active
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("id, owner_id, title, price")
        .eq("id", propertyId)
        .eq("status", "active")
        .single();

      if (propertyError || !property) {
        return res.status(404).json({
          success: false,
          message: "Property not found or not available",
        });
      }

      // Create offer record
      const { data: offer, error } = await supabase
        .from("offers")
        .insert([
          {
            buyer_id: buyerId,
            property_id: propertyId,
            owner_id: property.owner_id,
            offer_amount: parseFloat(offer_amount),
            message: message || "",
            offer_type,
            contingencies,
            closing_date,
            earnest_money: earnest_money ? parseFloat(earnest_money) : null,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ])
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
        message: "Offer placed successfully",
        data: offer,
      });
    } catch (error) {
      console.error("Place offer error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET /buyers/offers → view buyer's offers
  async getMyOffers(req, res) {
    try {
      const buyerId = req.user.id;
      const { page = 1, limit = 10, status = "all" } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("offers")
        .select(
          `
          *,
          properties:property_id (id, title, address, city, price, photos)
        `
        )
        .eq("buyer_id", buyerId);

      // Apply status filter
      if (status !== "all") {
        query = query.eq("status", status);
      }

      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: offers, error } = await query;

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // Get total count for pagination
      let countQuery = supabase
        .from("offers")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", buyerId);

      if (status !== "all") {
        countQuery = countQuery.eq("status", status);
      }

      const { count: totalCount } = await countQuery;

      res.json({
        success: true,
        data: {
          offers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get my offers error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // POST /buyers/purchase/:propertyId → complete purchase (advance payment, booking, etc.)
  async initiatePurchase(req, res) {
    try {
      const { propertyId } = req.params;
      const buyerId = req.user.id;
      const {
        purchase_type = "full_payment",
        advance_amount,
        payment_method,
        financing_details,
        closing_date,
        notes,
      } = req.body;

      // Validate advance amount
      if (!advance_amount || advance_amount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid advance amount is required",
        });
      }

      // Check if property exists and is active
      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("id, owner_id, title, price")
        .eq("id", propertyId)
        .eq("status", "active")
        .single();

      if (propertyError || !property) {
        return res.status(404).json({
          success: false,
          message: "Property not found or not available",
        });
      }

      // Check if there's an accepted offer from this buyer
      const { data: acceptedOffer } = await supabase
        .from("offers")
        .select("id")
        .eq("buyer_id", buyerId)
        .eq("property_id", propertyId)
        .eq("status", "accepted")
        .single();

      if (!acceptedOffer) {
        return res.status(400).json({
          success: false,
          message:
            "No accepted offer found. Please ensure your offer is accepted first.",
        });
      }

      // Create purchase record
      const { data: purchase, error } = await supabase
        .from("purchases")
        .insert([
          {
            buyer_id: buyerId,
            property_id: propertyId,
            owner_id: property.owner_id,
            offer_id: acceptedOffer.id,
            purchase_type,
            advance_amount: parseFloat(advance_amount),
            remaining_amount: property.price - parseFloat(advance_amount),
            payment_method,
            financing_details,
            closing_date,
            notes,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ])
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
        message: "Purchase process initiated successfully",
        data: purchase,
      });
    } catch (error) {
      console.error("Initiate purchase error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET /buyers/purchases → view buyer's purchases
  async getMyPurchases(req, res) {
    try {
      const buyerId = req.user.id;
      const { page = 1, limit = 10, status = "all" } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("purchases")
        .select(
          `
          *,
          properties:property_id (id, title, address, city, price, photos)
        `
        )
        .eq("buyer_id", buyerId);

      // Apply status filter
      if (status !== "all") {
        query = query.eq("status", status);
      }

      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: purchases, error } = await query;

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // Get total count for pagination
      let countQuery = supabase
        .from("purchases")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", buyerId);

      if (status !== "all") {
        countQuery = countQuery.eq("status", status);
      }

      const { count: totalCount } = await countQuery;

      res.json({
        success: true,
        data: {
          purchases,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get my purchases error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET /buyers/interests → view buyer's interests
  async getMyInterests(req, res) {
    try {
      const buyerId = req.user.id;
      const { page = 1, limit = 10, status = "all" } = req.query;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("interests")
        .select(
          `
          *,
          properties:property_id (id, title, address, city, price, photos)
        `
        )
        .eq("buyer_id", buyerId);

      // Apply status filter
      if (status !== "all") {
        query = query.eq("status", status);
      }

      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: interests, error } = await query;

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      // Get total count for pagination
      let countQuery = supabase
        .from("interests")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", buyerId);

      if (status !== "all") {
        countQuery = countQuery.eq("status", status);
      }

      const { count: totalCount } = await countQuery;

      res.json({
        success: true,
        data: {
          interests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get my interests error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET /buyers/dashboard → buyer dashboard with statistics
  async getDashboard(req, res) {
    try {
      const buyerId = req.user.id;

      // Get counts for different entities
      const [favoritesCount, interestsCount, offersCount, purchasesCount] =
        await Promise.all([
          supabase
            .from("favorites")
            .select("*", { count: "exact", head: true })
            .eq("buyer_id", buyerId),
          supabase
            .from("interests")
            .select("*", { count: "exact", head: true })
            .eq("buyer_id", buyerId),
          supabase
            .from("offers")
            .select("*", { count: "exact", head: true })
            .eq("buyer_id", buyerId),
          supabase
            .from("purchases")
            .select("*", { count: "exact", head: true })
            .eq("buyer_id", buyerId),
        ]);

      // Get recent activities
      const { data: recentOffers } = await supabase
        .from("offers")
        .select(
          `
          id,
          status,
          offer_amount,
          created_at,
          properties:property_id (title, address)
        `
        )
        .eq("buyer_id", buyerId)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: recentInterests } = await supabase
        .from("interests")
        .select(
          `
          id,
          status,
          created_at,
          properties:property_id (title, address)
        `
        )
        .eq("buyer_id", buyerId)
        .order("created_at", { ascending: false })
        .limit(5);

      res.json({
        success: true,
        data: {
          statistics: {
            favorites: favoritesCount.count || 0,
            interests: interestsCount.count || 0,
            offers: offersCount.count || 0,
            purchases: purchasesCount.count || 0,
          },
          recentActivity: {
            offers: recentOffers || [],
            interests: recentInterests || [],
          },
        },
      });
    } catch (error) {
      console.error("Get dashboard error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new BuyerController();
