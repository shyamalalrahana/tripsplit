"use client";

import { createClient } from "@supabase/supabase-js";

const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const configuredSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseUrl = configuredSupabaseUrl || "https://example.supabase.co";
const supabaseAnonKey = configuredSupabaseAnonKey || "example-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function hasSupabaseEnv() {
  return Boolean(configuredSupabaseUrl && configuredSupabaseAnonKey);
}
