import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/env";

/**
 * Lazily-constructed Supabase admin client (secret API key).
 *
 * Used only on the server for private Storage upload + signed URLs.
 * Never import this module from Client Components.
 */
let adminClient: SupabaseClient | undefined;

/**
 * Returns the shared Supabase client with the secret key (`sb_secret_…`).
 *
 * @throws {Error} if `SUPABASE_URL` or `SUPABASE_SECRET_KEY` is unset.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
      throw new Error("SUPABASE_URL or SUPABASE_SECRET_KEY is not set");
    }

    adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return adminClient;
}

/** True when Storage env vars are present (upload/signed URL ready). */
export function isSupabaseStorageConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);
}
