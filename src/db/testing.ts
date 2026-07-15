import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "./schema";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export interface TestDbHandle {
  db: TestDb;
  client: PGlite;
}

/**
 * Spins up a fresh, isolated in-memory PGlite instance and applies every
 * migration in `./drizzle` to it, giving each test its own clean database.
 *
 * Call this per test (or per test file, in `beforeEach`/`beforeAll`) and
 * remember to `await client.close()` afterwards to release the in-memory
 * instance — each call is independent and never shares state with another.
 */
export async function createTestDb(): Promise<TestDbHandle> {
  const client = new PGlite();
  const db = drizzle({ client, schema });

  await migrate(db, { migrationsFolder: "./drizzle" });

  return { db, client };
}
