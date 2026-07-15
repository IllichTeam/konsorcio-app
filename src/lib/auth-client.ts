import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

import { env } from "@/env";

/**
 * better-auth client for use in Client Components. Points at
 * `BETTER_AUTH_URL` (same origin as the app in this project's setup) and
 * exposes the email/password flows plus the `useSession` hook.
 *
 * `adminClient()` mirrors the server-side `admin()` plugin so the client's
 * inferred types (and future `authClient.admin.*` calls) include the
 * `role`/`banned`/`banReason`/`banExpires` fields added to the session user.
 */
export const authClient = createAuthClient({
  baseURL: env.BETTER_AUTH_URL,
  plugins: [adminClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
