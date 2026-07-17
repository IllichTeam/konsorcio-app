import { fileURLToPath } from "node:url";

import { db } from "@/db";
import { createAuth } from "@/lib/auth";
import { ROLES, type AppRole } from "@/lib/auth/roles";

const MIN_PASSWORD_LENGTH = 8;

const ROLE_VALUES = new Set<string>(Object.values(ROLES));

export class CreateUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateUserError";
  }
}

export interface CreateCredentialUserInput {
  email: string;
  password: string;
  name?: string;
  role?: AppRole;
}

export interface CreateCredentialUserResult {
  userId: string;
  email: string;
  role: AppRole;
  created: true;
}

type Database = Parameters<typeof createAuth>[0];

function defaultNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : "User";
}

function assertValidPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new CreateUserError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

function assertValidRole(role: string): asserts role is AppRole {
  if (!ROLE_VALUES.has(role)) {
    throw new CreateUserError(
      `Invalid role "${role}". Expected one of: ${[...ROLE_VALUES].join(", ")}.`,
    );
  }
}

/**
 * Creates a credential (email/password) user via Better Auth's internal
 * adapter — the same path `seed-admin` uses — so hashes match `signInEmail`.
 *
 * Unlike `seedAdmin`, this is **not** idempotent: an existing email fails.
 */
export async function createCredentialUser(
  database: Database,
  { email, password, name, role = ROLES.admin }: CreateCredentialUserInput,
): Promise<CreateCredentialUserResult> {
  assertValidPassword(password);
  assertValidRole(role);

  const auth = createAuth(database);
  const ctx = await auth.$context;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    throw new CreateUserError(`Invalid email "${email}".`);
  }

  const existing = await ctx.internalAdapter.findUserByEmail(normalizedEmail);
  if (existing) {
    throw new CreateUserError(`User with email "${normalizedEmail}" already exists.`);
  }

  const displayName = name?.trim() || defaultNameFromEmail(normalizedEmail);
  const hashedPassword = await ctx.password.hash(password);

  const user = await ctx.internalAdapter.createUser({
    email: normalizedEmail,
    name: displayName,
    emailVerified: true,
    role,
  });

  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: hashedPassword,
  });

  return {
    userId: user.id,
    email: normalizedEmail,
    role,
    created: true,
  };
}

interface ParsedCliArgs {
  email?: string;
  password?: string;
  name?: string;
  role?: string;
}

function parseCliArgs(argv: string[]): ParsedCliArgs {
  const out: ParsedCliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg?.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = argv[i + 1];
    const value = next && !next.startsWith("--") ? next : undefined;

    if (key === "email" && value) {
      out.email = value;
      i++;
    } else if (key === "password" && value) {
      out.password = value;
      i++;
    } else if (key === "name" && value) {
      out.name = value;
      i++;
    } else if (key === "role" && value) {
      out.role = value;
      i++;
    }
  }

  return out;
}

/**
 * CLI entry — `pnpm db:create-user` / `pnpm db:create-user:prod`.
 *
 * Uses the app `db` (`DB_DRIVER`: pglite locally, postgres in prod). Requires
 * migrations already applied.
 */
async function main() {
  const args = parseCliArgs(process.argv.slice(2));

  if (!args.email || !args.password) {
    throw new CreateUserError(
      "Usage: pnpm db:create-user -- --email <email> --password <password> [--name <name>] [--role admin|tenant|superadmin]",
    );
  }

  const role = (args.role ?? ROLES.admin) as AppRole;
  const result = await createCredentialUser(db, {
    email: args.email,
    password: args.password,
    name: args.name,
    role,
  });

  console.log(
    `OK userId=${result.userId} email=${result.email} role=${result.role} created=${result.created}`,
  );
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  main()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
      console.error(`NO OK ${message}`);
      process.exit(1);
    });
}
