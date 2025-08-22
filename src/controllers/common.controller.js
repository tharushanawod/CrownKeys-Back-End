const { supabase } = require("../config/supabase");
const {
  SUPABASE_URL
} = require("../config/env");

class CommonController {
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

 
}

module.exports = new CommonController();
