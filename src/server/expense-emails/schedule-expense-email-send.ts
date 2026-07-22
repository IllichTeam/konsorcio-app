import "server-only";

import { after } from "next/server";

import { runExpenseEmailSend } from "./run-expense-email-send";

/**
 * Schedules the fan-out runner after the HTTP/tRPC response is sent.
 * Uses Next.js `after()` from `next/server` (platform `waitUntil` on Vercel).
 *
 * Note: local `node_modules/next/dist/docs/` in this install has no dedicated
 * `after.md`; the import matches the Next 16 App Router API already used in-repo.
 * Create returns immediately; fan-out continues within the route `maxDuration`
 * ceiling (`/api/trpc` = 120s). Interrupted recipients stay `pending` / `failed`
 * and are recoverable via `retryPending`.
 */
export function scheduleExpenseEmailSend(sendId: string): void {
  after(async () => {
    try {
      await runExpenseEmailSend(sendId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Expense email send runner failed", { sendId, message });
    }
  });
}
