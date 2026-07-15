import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/env";
import { sendEmail } from "@/lib/email/send-email";

/**
 * Builds a better-auth instance backed by the given Drizzle database.
 *
 * Factored out as `createAuth(database)` (instead of a single module-level
 * instance) so tests can point better-auth at an isolated PGlite instance
 * (`createTestDb()`) without touching the app's global `db` singleton. The
 * default export below (`auth`) is the app-wide instance used by the route
 * handler and server code.
 */
export function createAuth(database: Parameters<typeof drizzleAdapter>[0] = db) {
  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      // Public self sign-up is disabled: the only account provisioning path
      // is the idempotent admin seed (`src/db/seed-admin.ts`). Accounts for
      // any other user are created by an admin via the `admin` plugin.
      disableSignUp: true,
    },
    // Keep CSRF origin checks working across local ports (dev default is 3200).
    trustedOrigins: ["http://localhost:*", "http://127.0.0.1:*"],
    rateLimit: {
      customRules: {
        "/email-otp/request-password-reset": { window: 60, max: 1 },
        "/email-otp/send-verification-otp": { window: 60, max: 1 },
      },
    },
    // Default `admin`/`user` roles. Permission statements/access control are
    // deliberately left unconfigured here (deferred to a later task).
    plugins: [
      admin(),
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "forget-password") return;
          await sendEmail({
            to: email,
            subject: "Código de recuperación",
            text: `Tu código es: ${otp}`,
          });
        },
      }),
    ],
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
  });
}

export const auth = createAuth();
