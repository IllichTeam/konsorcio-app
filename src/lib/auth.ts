import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP } from "better-auth/plugins";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/env";
import { ac, authRoles } from "@/lib/auth/permissions";
import { ROLES } from "@/lib/auth/roles";
import { sendOtpEmail } from "@/lib/email/send-otp-email";

function getTrustedOrigins(): string[] {
  const origins = [
    "http://localhost:*",
    "http://127.0.0.1:*",
    env.BETTER_AUTH_URL.replace(/\/$/, ""),
  ];

  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  return [...new Set(origins)];
}

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
      // any other user are created by a superadmin via the `admin` plugin.
      disableSignUp: true,
    },
    user: {
      additionalFields: {
        phone: {
          type: "string",
          required: false,
          input: true,
        },
        address: {
          type: "string",
          required: false,
          input: true,
        },
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
        strategy: "compact",
      },
    },
    trustedOrigins: getTrustedOrigins(),
    rateLimit: {
      customRules: {
        "/email-otp/request-password-reset": { window: 60, max: 1 },
        "/email-otp/send-verification-otp": { window: 60, max: 1 },
      },
    },
    plugins: [
      admin({
        ac,
        roles: authRoles,
        adminRoles: [ROLES.superadmin],
        defaultRole: ROLES.admin,
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "forget-password") return;
          await sendOtpEmail({
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
