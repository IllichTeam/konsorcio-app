import { describe, expect, it, vi } from "vitest";

import { isResendRateLimitError, mapWithConcurrency, withRateLimitRetry } from "./concurrency";

describe("isResendRateLimitError", () => {
  it("detects 429 statusCode, status, and rate_limit_exceeded name", () => {
    expect(isResendRateLimitError({ statusCode: 429 })).toBe(true);
    expect(isResendRateLimitError({ status: 429 })).toBe(true);
    expect(isResendRateLimitError({ name: "rate_limit_exceeded" })).toBe(true);
    expect(isResendRateLimitError({ statusCode: 500 })).toBe(false);
    expect(isResendRateLimitError(null)).toBe(false);
  });
});

describe("withRateLimitRetry", () => {
  it("retries 429 responses with backoff then succeeds", async () => {
    const sleep = vi.fn(async () => undefined);
    let attempts = 0;

    const result = await withRateLimitRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw Object.assign(new Error("slow down"), { statusCode: 429 });
        }
        return "ok";
      },
      { maxAttempts: 4, baseDelayMs: 10, maxDelayMs: 100, sleep },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-rate-limit errors", async () => {
    const sleep = vi.fn(async () => undefined);

    await expect(
      withRateLimitRetry(
        async () => {
          throw Object.assign(new Error("boom"), { statusCode: 400 });
        },
        { sleep },
      ),
    ).rejects.toThrow("boom");
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe("mapWithConcurrency", () => {
  it("preserves order and respects the concurrency ceiling", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return item * 10;
    });

    expect(result).toEqual([10, 20, 30, 40, 50]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it("rejects a non-positive concurrency", async () => {
    await expect(mapWithConcurrency([1], 0, async (item) => item)).rejects.toThrow(
      /positive integer/i,
    );
  });
});
