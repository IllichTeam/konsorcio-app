export type MetricKey =
  | "ttfbHome"
  | "domContentLoadedHome"
  | "loginApi"
  | "loginPerceived"
  | "loginNavigation"
  | "createPerceived"
  | "createApi"
  | "editPerceived"
  | "editApi"
  /** Report-only: first consortiums.list after login (0 if hydrated / no network). */
  | "listApi"
  /** Report-only: consortiums.byId during edit (0 if skipped via initial data). */
  | "byIdApi"
  /** Report-only: /api/auth responses during an iteration. */
  | "authRoundTrips"
  /** Report-only: /api/trpc responses during an iteration. */
  | "trpcRoundTrips";

export type PerfTarget = "local" | "remote";

export type Verdict = "green" | "yellow" | "red";

export type RubricBudget = {
  label: string;
  greenMs: number;
  yellowMs: number;
};

export type Rubric = Record<MetricKey, RubricBudget>;

/**
 * Local budgets (prod build on localhost / PGlite).
 * Green: < greenMs; Yellow: < yellowMs; Red: >= yellowMs.
 */
export const LOCAL_RUBRIC = {
  ttfbHome: { label: "TTFB /", greenMs: 200, yellowMs: 500 },
  domContentLoadedHome: { label: "DCL /", greenMs: 800, yellowMs: 1500 },
  loginApi: { label: "API login (sign-in)", greenMs: 400, yellowMs: 800 },
  loginPerceived: { label: "Login percibido", greenMs: 1500, yellowMs: 3000 },
  loginNavigation: { label: "Navegación post-login", greenMs: 1000, yellowMs: 2200 },
  createPerceived: { label: "Crear consorcio", greenMs: 800, yellowMs: 1500 },
  createApi: { label: "API tRPC create", greenMs: 300, yellowMs: 600 },
  editPerceived: { label: "Editar consorcio", greenMs: 800, yellowMs: 1500 },
  editApi: { label: "API tRPC update", greenMs: 300, yellowMs: 600 },
  // Report-only — generous ceilings so they never fail the suite.
  listApi: { label: "API tRPC list", greenMs: 500, yellowMs: 5000 },
  byIdApi: { label: "API tRPC byId", greenMs: 500, yellowMs: 5000 },
  authRoundTrips: { label: "Round-trips auth", greenMs: 5, yellowMs: 50 },
  trpcRoundTrips: { label: "Round-trips tRPC", greenMs: 10, yellowMs: 50 },
} as const satisfies Rubric;

/**
 * Remote budgets (Vercel + Supabase). Includes RTT, cold starts and pooler latency.
 * Tuned from first remote baseline (~1.3s sign-in API, ~4s warm login, ~2s mutations).
 */
export const REMOTE_RUBRIC = {
  ttfbHome: { label: "TTFB /", greenMs: 800, yellowMs: 2500 },
  domContentLoadedHome: { label: "DCL /", greenMs: 2000, yellowMs: 5000 },
  loginApi: { label: "API login (sign-in)", greenMs: 1500, yellowMs: 3000 },
  loginPerceived: { label: "Login percibido", greenMs: 5000, yellowMs: 15000 },
  loginNavigation: { label: "Navegación post-login", greenMs: 4000, yellowMs: 12000 },
  createPerceived: { label: "Crear consorcio", greenMs: 2500, yellowMs: 5000 },
  createApi: { label: "API tRPC create", greenMs: 1500, yellowMs: 3000 },
  editPerceived: { label: "Editar consorcio", greenMs: 2500, yellowMs: 5000 },
  editApi: { label: "API tRPC update", greenMs: 1500, yellowMs: 3000 },
  // Report-only — generous ceilings so they never fail the suite.
  listApi: { label: "API tRPC list", greenMs: 2000, yellowMs: 10000 },
  byIdApi: { label: "API tRPC byId", greenMs: 2000, yellowMs: 10000 },
  authRoundTrips: { label: "Round-trips auth", greenMs: 5, yellowMs: 50 },
  trpcRoundTrips: { label: "Round-trips tRPC", greenMs: 10, yellowMs: 50 },
} as const satisfies Rubric;

/** @deprecated Use LOCAL_RUBRIC or getRubric(target). Kept as alias for local. */
export const RUBRIC = LOCAL_RUBRIC;

/** Metrics that fail the suite when median hits red. */
export const ASSERTED_METRICS: MetricKey[] = [
  "ttfbHome",
  "loginApi",
  "loginPerceived",
  "createPerceived",
  "createApi",
  "editPerceived",
  "editApi",
];

export function getRubric(target: PerfTarget): Rubric {
  return target === "remote" ? REMOTE_RUBRIC : LOCAL_RUBRIC;
}

export function verdictFor(ms: number, budget: RubricBudget): Verdict {
  if (ms < budget.greenMs) return "green";
  if (ms < budget.yellowMs) return "yellow";
  return "red";
}
