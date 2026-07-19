import { createAuthClient } from "better-auth/react";
import { adminClient, emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

import { ac, authRoles } from "@/lib/auth/permissions";

/**
 * better-auth client for use in Client Components.
 *
 * No `baseURL`: falls back to same-origin `/api/auth`. That avoids
 * `Failed to fetch` if the browser origin and `BETTER_AUTH_URL` diverge.
 *
 * `adminClient()` mirrors the server-side `admin()` plugin so the client's
 * inferred types (and future `authClient.admin.*` calls) include the
 * `role`/`banned`/`banReason`/`banExpires` fields added to the session user.
 *
 * `inferAdditionalFields` keeps `phone` / `address` on updateUser + session user.
 */
export const authClient = createAuthClient({
  plugins: [
    adminClient({
      ac,
      roles: authRoles,
    }),
    emailOTPClient(),
    inferAdditionalFields({
      user: {
        phone: {
          type: "string",
          required: false,
        },
        address: {
          type: "string",
          required: false,
        },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
