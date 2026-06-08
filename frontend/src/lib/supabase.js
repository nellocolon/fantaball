import { createClient } from "@supabase/supabase-js";

// These come from frontend/.env (see .env.example) or Netlify Environment variables.
// With Vite, only vars prefixed VITE_ are exposed to the client.
// Use the ANON key here — never the service_role key in frontend code.
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env vars are missing we export null so the app can fall back to demo data
// instead of crashing. lib/data.js checks for this.
export const supabase = url && anon ? createClient(url, anon) : null;

export const HAS_SUPABASE = !!supabase;
