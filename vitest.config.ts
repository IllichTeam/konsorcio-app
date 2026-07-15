import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Multiple test files import `src/lib/auth.ts`, whose top-level
    // `export const auth = createAuth()` eagerly opens the real,
    // file-backed local PGlite store at `./.pglite` (see `src/db/index.ts`)
    // as a side effect of the import — independent of the in-memory
    // `createTestDb()` instances each test actually exercises. Running test
    // files in parallel workers each tries to open that same on-disk store
    // concurrently, which PGlite does not support and fails with
    // "PGlite failed to initialize properly". Serializing file execution
    // avoids the concurrent open; it's a config-only fix so we don't need to
    // change `auth.ts`'s intentional eager factory pattern.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
});
