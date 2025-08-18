const Joi = require("joi");

// User validation schemas
const registrationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    "string.min": "First name must be at least 2 characters long",
    "string.max": "First name cannot exceed 50 characters",
    "any.required": "First name is required",
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    "string.min": "Last name must be at least 2 characters long",
    "string.max": "Last name cannot exceed 50 characters",
    "any.required": "Last name is required",
  }),
  phone: Joi.string()
    .pattern(/^0\d{9}$/)
    .required()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
      "any.required": "phone number is required",
    }),
  role: Joi.string().valid("buyer", "agent", "admin", "owner").default("buyer"),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

// Listing validation schemas
const listingSchema = Joi.object({
  title: Joi.string().min(5).max(200).required().messages({
    "string.min": "Title must be at least 5 characters long",
    "string.max": "Title cannot exceed 200 characters",
    "any.required": "Title is required",
  }),
  description: Joi.string().min(20).max(2000).required().messages({
    "string.min": "Description must be at least 20 characters long",
    "string.max": "Description cannot exceed 2000 characters",
    "any.required": "Description is required",
  }),
  price: Joi.number().positive().required().messages({
    "number.positive": "Price must be a positive number",
    "any.required": "Price is required",
  }),
  size: Joi.number().positive().required().messages({
    "number.positive": "Size must be a positive number",
    "any.required": "Size is required",
  }),
  property_type: Joi.string()
    .valid(
      "house",
      "apartment",
      "condo",
      "townhouse",
      "villa",
      "land",
      "commercial"
    )
    .required()
    .messages({
      "any.only":
        "Property type must be one of: house, apartment, condo, townhouse, villa, land, commercial",
      "any.required": "Property type is required",
    }),
  address: Joi.string().min(5).max(300).required().messages({
    "string.min": "Address must be at least 5 characters long",
    "string.max": "Address cannot exceed 300 characters",
    "any.required": "Address is required",
  }),
  city: Joi.string().min(2).max(100).required().messages({
    "string.min": "City must be at least 2 characters long",
    "string.max": "City cannot exceed 100 characters",
    "any.required": "City is required",
  }),
  state: Joi.string().min(2).max(100).required().messages({
    "string.min": "State must be at least 2 characters long",
    "string.max": "State cannot exceed 100 characters",
    "any.required": "State is required",
  }),
  zip_code: Joi.string().required().messages({
    "any.required": "ZIP code is required",
  }),
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).required().messages({
      "number.min": "Latitude must be between -90 and 90",
      "number.max": "Latitude must be between -90 and 90",
      "any.required": "Latitude is required",
    }),
    lng: Joi.number().min(-180).max(180).required().messages({
      "number.min": "Longitude must be between -180 and 180",
      "number.max": "Longitude must be between -180 and 180",
      "any.required": "Longitude is required",
    }),
  })
    .required()
    .messages({
      "any.required": "Location coordinates are required",
    }),
  bedrooms: Joi.number().integer().min(0).max(20).optional().messages({
    "number.integer": "Bedrooms must be a whole number",
    "number.min": "Bedrooms cannot be negative",
    "number.max": "Bedrooms cannot exceed 20",
  }),
  bathrooms: Joi.number().min(0).max(20).optional().messages({
    "number.min": "Bathrooms cannot be negative",
    "number.max": "Bathrooms cannot exceed 20",
  }),
  amenities: Joi.array().items(Joi.string()).optional().default([]),
  photos: Joi.array().items(Joi.string().uri()).optional().default([]),
  status: Joi.string()
    .valid("active", "inactive", "sold", "rented")
    .default("active")
    .messages({
      "any.only": "Status must be one of: active, inactive, sold, rented",
    }),
});

const listingUpdateSchema = listingSchema.fork(
  [
    "title",
    "description",
    "price",
    "size",
    "property_type",
    "address",
    "city",
    "state",
    "zip_code",
    "location",
  ],
  (schema) => schema.optional()
);

// Property validation schema for owners (similar to listing but for properties table)
const propertySchema = Joi.object({
  title: Joi.string().min(5).max(200).required().messages({
    "string.min": "Title must be at least 5 characters long",
    "string.max": "Title cannot exceed 200 characters",
    "any.required": "Title is required",
  }),
  description: Joi.string().min(20).max(2000).required().messages({
    "string.min": "Description must be at least 20 characters long",
    "string.max": "Description cannot exceed 2000 characters",
    "any.required": "Description is required",
  }),
  price: Joi.number().positive().required().messages({
    "number.positive": "Price must be a positive number",
    "any.required": "Price is required",
  }),
  size: Joi.number().positive().required().messages({
    "number.positive": "Size must be a positive number",
    "any.required": "Size is required",
  }),
  property_type: Joi.string()
    .valid(
      "house",
      "apartment",
      "condo",
      "townhouse",
      "villa",
      "land",
      "commercial"
    )
    .required()
    .messages({
      "any.only":
        "Property type must be one of: house, apartment, condo, townhouse, villa, land, commercial",
      "any.required": "Property type is required",
    }),
  address: Joi.string().min(5).max(300).required().messages({
    "string.min": "Address must be at least 5 characters long",
    "string.max": "Address cannot exceed 300 characters",
    "any.required": "Address is required",
  }),
  city: Joi.string().min(2).max(100).required().messages({
    "string.min": "City must be at least 2 characters long",
    "string.max": "City cannot exceed 100 characters",
    "any.required": "City is required",
  }),
  state: Joi.string().min(2).max(100).required().messages({
    "string.min": "State must be at least 2 characters long",
    "string.max": "State cannot exceed 100 characters",
    "any.required": "State is required",
  }),
  zip_code: Joi.string().required().messages({
    "any.required": "ZIP code is required",
  }),
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).required().messages({
      "number.min": "Latitude must be between -90 and 90",
      "number.max": "Latitude must be between -90 and 90",
      "any.required": "Latitude is required",
    }),
    lng: Joi.number().min(-180).max(180).required().messages({
      "number.min": "Longitude must be between -180 and 180",
      "number.max": "Longitude must be between -180 and 180",
      "any.required": "Longitude is required",
    }),
  })
    .required()
    .messages({
      "any.required": "Location coordinates are required",
    }),
  bedrooms: Joi.number().integer().min(0).max(20).optional().messages({
    "number.integer": "Bedrooms must be a whole number",
    "number.min": "Bedrooms cannot be negative",
    "number.max": "Bedrooms cannot exceed 20",
  }),
  bathrooms: Joi.number().min(0).max(20).optional().messages({
    "number.min": "Bathrooms cannot be negative",
    "number.max": "Bathrooms cannot exceed 20",
  }),
  amenities: Joi.array().items(Joi.string()).optional().default([]),
  photos: Joi.array().items(Joi.string().uri()).optional().default([]),
  status: Joi.string().valid("active", "inactive").default("active").messages({
    "any.only": "Status must be one of: active, inactive",
  }),
});

const propertyUpdateSchema = propertySchema.fork(
  [
    "title",
    "description",
    "price",
    "size",
    "property_type",
    "address",
    "city",
    "state",
    "zip_code",
    "location",
  ],
  (schema) => schema.optional()
);

// Agent validation schema
const agentSchema = Joi.object({
  license_number: Joi.string().min(5).max(50).required().messages({
    "string.min": "License number must be at least 5 characters long",
    "string.max": "License number cannot exceed 50 characters",
    "any.required": "License number is required",
  }),
  agency: Joi.string().min(2).max(200).required().messages({
    "string.min": "Agency name must be at least 2 characters long",
    "string.max": "Agency name cannot exceed 200 characters",
    "any.required": "Agency name is required",
  }),
  bio: Joi.string().max(1000).optional().messages({
    "string.max": "Bio cannot exceed 1000 characters",
  }),
  specialties: Joi.array().items(Joi.string()).optional(),
  years_experience: Joi.number().integer().min(0).max(50).optional().messages({
    "number.integer": "Years of experience must be a whole number",
    "number.min": "Years of experience cannot be negative",
    "number.max": "Years of experience cannot exceed 50",
  }),
  languages: Joi.array().items(Joi.string()).optional(),
  website: Joi.string().uri().optional().messages({
    "string.uri": "Please provide a valid website URL",
  }),
  facebook: Joi.string().uri().optional().messages({
    "string.uri": "Please provide a valid Facebook URL",
  }),
  twitter: Joi.string().uri().optional().messages({
    "string.uri": "Please provide a valid Twitter URL",
  }),
  linkedin: Joi.string().uri().optional().messages({
    "string.uri": "Please provide a valid LinkedIn URL",
  }),
  office_address: Joi.string().max(300).optional().messages({
    "string.max": "Office address cannot exceed 300 characters",
  }),
  city: Joi.string().min(2).max(100).optional().messages({
    "string.min": "City must be at least 2 characters long",
    "string.max": "City cannot exceed 100 characters",
  }),
  state: Joi.string().min(2).max(100).optional().messages({
    "string.min": "State must be at least 2 characters long",
    "string.max": "State cannot exceed 100 characters",
  }),
});

// Validation middleware functions
const validateRegistration = (req, res, next) => {
  const { error } = registrationSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

const validateListingUpdate = (req, res, next) => {
  const { error } = listingUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

const validateAgent = (req, res, next) => {
  const { error } = agentSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

const validateProperty = (req, res, next) => {
  const { error } = propertySchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

const validatePropertyUpdate = (req, res, next) => {
  const { error } = propertyUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

const validateInterest = (req, res, next) => {
  const { error } = interestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

const validateOffer = (req, res, next) => {
  const { error } = offerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

const validatePurchase = (req, res, next) => {
  const { error } = purchaseSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }
  next();
};

// Buyer validation schemas
const interestSchema = Joi.object({
  message: Joi.string().max(1000).optional().messages({
    "string.max": "Message cannot exceed 1000 characters",
  }),
  preferred_visit_time: Joi.date().iso().optional().messages({
    "date.iso": "Please provide a valid date in ISO format",
  }),
  contact_method: Joi.string()
    .valid("email", "phone", "both")
    .default("email")
    .messages({
      "any.only": "Contact method must be one of: email, phone, both",
    }),
});

const offerSchema = Joi.object({
  offer_amount: Joi.number().positive().required().messages({
    "number.positive": "Offer amount must be a positive number",
    "any.required": "Offer amount is required",
  }),
  message: Joi.string().max(1000).optional().messages({
    "string.max": "Message cannot exceed 1000 characters",
  }),
  offer_type: Joi.string()
    .valid("purchase", "rent", "lease")
    .default("purchase")
    .messages({
      "any.only": "Offer type must be one of: purchase, rent, lease",
    }),
  contingencies: Joi.array().items(Joi.string()).optional().default([]),
  closing_date: Joi.date().iso().optional().messages({
    "date.iso": "Please provide a valid closing date in ISO format",
  }),
  earnest_money: Joi.number().positive().optional().messages({
    "number.positive": "Earnest money must be a positive number",
  }),
});

const purchaseSchema = Joi.object({
  purchase_type: Joi.string()
    .valid("full_payment", "installment", "financing")
    .default("full_payment")
    .messages({
      "any.only":
        "Purchase type must be one of: full_payment, installment, financing",
    }),
  advance_amount: Joi.number().positive().required().messages({
    "number.positive": "Advance amount must be a positive number",
    "any.required": "Advance amount is required",
  }),
  payment_method: Joi.string()
    .valid("cash", "bank_transfer", "check", "credit_card")
    .optional()
    .messages({
      "any.only":
        "Payment method must be one of: cash, bank_transfer, check, credit_card",
    }),
  financing_details: Joi.object({
    bank_name: Joi.string().optional(),
    loan_amount: Joi.number().positive().optional(),
    interest_rate: Joi.number().positive().optional(),
    loan_term: Joi.number().integer().positive().optional(),
  }).optional(),
  closing_date: Joi.date().iso().optional().messages({
    "date.iso": "Please provide a valid closing date in ISO format",
  }),
  notes: Joi.string().max(1000).optional().messages({
    "string.max": "Notes cannot exceed 1000 characters",
  }),
});

// Helper functions
const sanitizeInput = (input) => {
  if (typeof input === "string") {
    return input.trim().replace(/[<>]/g, "");
  }
  return input;
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeInput(value);
  }
  return sanitized;
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateListing,
  validateListingUpdate,
  validateAgent,
  validateProperty,
  validatePropertyUpdate,
  validateInterest,
  validateOffer,
  validatePurchase,
  sanitizeInput,
  sanitizeObject,
  schemas: {
    registrationSchema,
    loginSchema,
    listingSchema,
    listingUpdateSchema,
    agentSchema,
    propertySchema,
    propertyUpdateSchema,
    interestSchema,
    offerSchema,
    purchaseSchema,
  },
};
