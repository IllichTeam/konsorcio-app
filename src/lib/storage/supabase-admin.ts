import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/env";

/**
 * Lazily-constructed Supabase admin client (service role).
 *
 * Used only on the server for private Storage upload + signed URLs.
 * Never import this module from Client Components.
 */
let adminClient: SupabaseClient | undefined;

/**
 * Returns the shared Supabase client with the service role key.
 *
 * @throws {Error} if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is unset.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
    }

    adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

/** True when Storage env vars are present (upload/signed URL ready). */
export function isSupabaseStorageConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}
