import { env } from "@/env";

/**
 * Returns the address Resend should deliver to.
 *
 * When `EMAIL_OVERRIDE_TO` is set, every outbound email is redirected there
 * (temporary while the production domain is unverified in Resend).
 */
export function resolveEmailTo(intended: string): string {
  return env.EMAIL_OVERRIDE_TO ?? intended;
}

/** Whether outbound Resend recipients are currently being overridden. */
export function isEmailToOverridden(): boolean {
  return Boolean(env.EMAIL_OVERRIDE_TO);
}
