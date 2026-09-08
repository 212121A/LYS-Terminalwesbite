import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Supabase-Client mit Service-Role-Key, oder `null` wenn die ENV fehlt.
 *  Aufrufer antworten dann mit 503 statt zu crashen. */
export function getSupabaseOptional(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey);
}

/** Wie `getSupabaseOptional`, wirft aber statt `null` zu liefern. */
export function getSupabase(): SupabaseClient {
  const client = getSupabaseOptional();
  if (!client) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
  return client;
}
