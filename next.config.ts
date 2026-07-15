import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep PGlite as a native Node external — bundling it with Turbopack
  // breaks filesystem path resolution (ERR_INVALID_ARG_TYPE on URL objects).
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
