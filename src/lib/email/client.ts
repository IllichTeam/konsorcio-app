import "server-only";

import { Resend } from "resend";

import { env } from "@/env";

/**
 * Lazily-constructed, memoized `Resend` client.
 *
 * Constructing `Resend` at module top-level would throw as soon as this
 * module is imported (e.g. during build or by tooling that pulls in shared
 * code) when `RESEND_API_KEY` isn't set. Instead, the client is created on
 * first call and cached here, so importing this module is always safe and
 * the "not configured" error only surfaces when an email is actually sent.
 */
let resendClient: Resend | undefined;

/**
 * Returns the shared `Resend` client, constructing it on first use.
 *
 * @throws {Error} if `RESEND_API_KEY` is not set.
 */
export function getResendClient(): Resend {
  if (!resendClient) {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    resendClient = new Resend(env.RESEND_API_KEY);
  }

  return resendClient;
}
