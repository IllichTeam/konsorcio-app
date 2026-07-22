import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep PGlite as a native Node external — bundling it with Turbopack
  // breaks filesystem path resolution (ERR_INVALID_ARG_TYPE on URL objects).
  // Supabase client stays external to avoid bundling issues with its deps.
  serverExternalPackages: ["@electric-sql/pglite", "@supabase/supabase-js"],
};

export default nextConfig;
