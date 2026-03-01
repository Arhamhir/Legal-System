import { createClient } from "@supabase/supabase-js";
import { getEnvValue } from "./env";

const supabaseUrl = getEnvValue("VITE_SUPABASE_URL", "SUPABASE_URL");
const supabaseAnonKey = getEnvValue("VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
