/** Default fan-out concurrency for expense email sends (Resend ~10 req/s). */
export const EXPENSE_EMAIL_SEND_CONCURRENCY = 10;

export type RateLimitRetryOptions = {
  /** Total attempts including the first try. Default: 4. */
  maxAttempts?: number;
  /** Initial backoff delay in ms. Default: 500. */
  baseDelayMs?: number;
  /** Cap for exponential backoff in ms. Default: 8000. */
  maxDelayMs?: number;
  /** Override rate-limit detection (defaults to Resend 429 / rate_limit_exceeded). */
  isRateLimited?: (error: unknown) => boolean;
  /** Injectable sleep for tests. */
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Whether `error` looks like a Resend (or HTTP) rate-limit response.
 * Accepts thrown errors and plain `{ statusCode, name }` objects.
 */
export function isResendRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    statusCode?: number | null;
    status?: number | null;
    name?: string;
  };

  return (
    candidate.statusCode === 429 ||
    candidate.status === 429 ||
    candidate.name === "rate_limit_exceeded"
  );
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Runs `fn` and retries with exponential backoff when the failure is a 429.
 * Non-rate-limit errors propagate immediately. Attempts are capped.
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  options: RateLimitRetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 4;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const isRateLimited = options.isRateLimited ?? isResendRateLimitError;
  const sleep = options.sleep ?? defaultSleep;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("maxAttempts must be a positive integer");
  }

  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      if (!isRateLimited(error) || attempt >= maxAttempts) {
        throw error;
      }
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      await sleep(delay);
    }
  }
}

/**
 * Maps `items` with at most `concurrency` in-flight promises at a time.
 * Results keep input order. Prepared for the Phase 3 expense fan-out runner.
 *
 * @throws {Error} if `concurrency` is not a positive integer.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency <= 0) {
    throw new Error("Concurrency must be a positive integer");
  }

  if (items.length === 0) {
    return [];
  }

  const results = Array.from({ length: items.length }) as R[];

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) {
        return;
      }
      results[current] = await mapper(items[current] as T, current);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
