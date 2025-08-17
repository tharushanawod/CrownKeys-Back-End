const { createClient } = require("@supabase/supabase-js");
const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} = require("./env");

// Public client for general operations
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin client for service operations (with service role key)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = {
  supabase,
  supabaseAdmin,
};
