import { expect, test, type Page, type Response } from "@playwright/test";
import { performance as nodePerformance } from "node:perf_hooks";

import {
  assertAgainstRubric,
  printReport,
  resolveRubric,
  summarize,
  writeResultsJson,
  type IterationMetrics,
} from "./report";

const ITERATIONS = 5;
/** Better Auth default special rule: /sign-in → max 3 / 10s. */
const SIGN_IN_RATE_LIMIT_WINDOW_MS = 11_000;

function requireAdminCredentials(): { email: string; password: string } {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set (load via --env-file=.env). Run pnpm db:seed first.",
    );
  }

  return { email, password };
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Math.round(nodePerformance.now() - startedAt));
}

function isTrpcProcedure(response: Response, procedure: string): boolean {
  if (!response.url().includes("/api/trpc")) return false;
  if (response.request().method() !== "POST") return false;

  const escaped = procedure.replaceAll(".", "\\.");
  const boundary = new RegExp(`(?:^|[,/])${escaped}(?:$|[,/?&])`);

  const url = decodeURIComponent(response.url());
  if (boundary.test(url)) return true;

  const postData = response.request().postData() ?? "";
  return boundary.test(postData) || postData.includes(`"${procedure}"`);
}

function isSignInResponse(response: Response): boolean {
  return (
    response.request().method() === "POST" && response.url().includes("/api/auth/sign-in/email")
  );
}

function parseVercelRegion(vercelId: string | null): string | null {
  if (!vercelId) return null;
  // Format: edge::function::… e.g. gru1::iad1::zct7q-…
  return vercelId;
}

/**
 * Start waiting for a response, then run `action`, measure monotonic time until
 * the matching response arrives. Avoids Map/Request identity races and Date.now()
 * clock skew (which produced api=0 / login=-Ns on remote).
 */
async function measureActionUntilResponse(
  page: Page,
  match: (response: Response) => boolean,
  action: () => Promise<void>,
): Promise<{ response: Response; durationMs: number; startedAt: number }> {
  const responsePromise = page.waitForResponse(match, { timeout: 60_000 });
  const startedAt = nodePerformance.now();
  await action();
  const response = await responsePromise;
  return { response, durationMs: elapsedMs(startedAt), startedAt };
}

type RoundTripCounter = {
  auth: number;
  trpc: number;
  dispose: () => void;
};

function attachRoundTripCounter(page: Page): RoundTripCounter {
  const state = { auth: 0, trpc: 0 };
  const onResponse = (response: Response) => {
    const url = response.url();
    if (url.includes("/api/auth")) state.auth += 1;
    if (url.includes("/api/trpc")) state.trpc += 1;
  };
  page.on("response", onResponse);
  return {
    get auth() {
      return state.auth;
    },
    get trpc() {
      return state.trpc;
    },
    dispose: () => page.off("response", onResponse),
  };
}

async function measureHomeNavigation(page: Page): Promise<{
  ttfbHome: number;
  domContentLoadedHome: number;
  vercelRegion: string | null;
}> {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response, "home navigation response").toBeTruthy();

  const vercelRegion = parseVercelRegion(response?.headers()["x-vercel-id"] ?? null);

  const nav = await page.evaluate(() => {
    const entry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    if (!entry) {
      return { ttfb: 0, dcl: 0 };
    }

    return {
      ttfb: Math.max(0, entry.responseStart - entry.requestStart),
      dcl: Math.max(0, entry.domContentLoadedEventEnd - entry.startTime),
    };
  });

  // Remote RSC/hydration can remount the login form after DCL and wipe early fills.
  await page.waitForLoadState("load");
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeEditable();

  return {
    ttfbHome: Math.round(nav.ttfb),
    domContentLoadedHome: Math.round(nav.dcl),
    vercelRegion,
  };
}

/** Fill that survives React hydration / RHF remount (common on remote cold pages). */
async function fillStable(page: Page, selector: string, value: string): Promise<void> {
  const input = page.locator(selector);
  await expect(async () => {
    await input.click();
    await input.fill(value);
    await expect(input).toHaveValue(value);
  }).toPass({ timeout: 30_000, intervals: [100, 250, 500] });
}

async function loginAndMeasure(
  page: Page,
  credentials: { email: string; password: string },
): Promise<{
  loginApi: number;
  loginPerceived: number;
  loginNavigation: number;
  listApi: number;
}> {
  await fillStable(page, 'input[name="email"]', credentials.email);
  await fillStable(page, 'input[name="password"]', credentials.password);

  // list may be SSR-hydrated (no network). Measure RTT only when a client fetch fires.
  let listApi = 0;
  let listRequestStartedAt: number | null = null;
  const onListRequest = (request: import("@playwright/test").Request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/api/trpc") &&
      (request.url().includes("consortiums.list") ||
        (request.postData() ?? "").includes("consortiums.list"))
    ) {
      listRequestStartedAt = nodePerformance.now();
    }
  };
  page.on("request", onListRequest);
  const listResponsePromise = page
    .waitForResponse((response) => isTrpcProcedure(response, "consortiums.list"), {
      timeout: 60_000,
    })
    .then(() => {
      if (listRequestStartedAt != null) {
        listApi = elapsedMs(listRequestStartedAt);
      }
    })
    .catch(() => {
      listApi = 0;
    });

  const {
    response: loginApiResponse,
    durationMs: loginApi,
    startedAt,
  } = await measureActionUntilResponse(page, isSignInResponse, async () => {
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
  });

  if (!loginApiResponse.ok()) {
    const body = await loginApiResponse.text().catch(() => "");
    throw new Error(
      `sign-in failed: ${loginApiResponse.status()} ${loginApiResponse.statusText()} ${body}`,
    );
  }

  await expect(page.getByRole("heading", { name: "Selección de consorcios" })).toBeVisible({
    timeout: 60_000,
  });
  const loginPerceived = elapsedMs(startedAt);

  // Give list a brief window after heading; 0 means hydrated / no client fetch.
  await Promise.race([listResponsePromise, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  page.off("request", onListRequest);

  return {
    loginApi,
    loginPerceived,
    loginNavigation: Math.max(0, loginPerceived - loginApi),
    listApi,
  };
}

async function createConsortiumAndMeasure(
  page: Page,
  name: string,
): Promise<{ createPerceived: number; createApi: number }> {
  await page.getByRole("button", { name: "Agregar nuevo consorcio" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Agregar nuevo consorcio" })).toBeVisible();

  await dialog.getByLabel("Nombre del consorcio").fill(name);
  await dialog.getByLabel("Ubicación").fill("Buenos Aires");
  await dialog.getByLabel("Alias de cobro").fill("perf.alias.test");
  await dialog.getByLabel("Email").fill("perf@example.com");
  await dialog.getByLabel("Link de drive").fill("https://drive.google.com/drive/folders/perf");

  const {
    response: createApiResponse,
    durationMs: createApi,
    startedAt,
  } = await measureActionUntilResponse(
    page,
    (response) => isTrpcProcedure(response, "consortiums.create"),
    async () => {
      await dialog.getByRole("button", { name: "Guardar" }).click();
    },
  );

  if (!createApiResponse.ok()) {
    throw new Error(`consortiums.create failed: ${createApiResponse.status()}`);
  }

  await expect(page.getByText("Consorcio creado")).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  return { createPerceived: elapsedMs(startedAt), createApi };
}

async function editConsortiumAndMeasure(
  page: Page,
  currentName: string,
  nextName: string,
): Promise<{ editPerceived: number; editApi: number; byIdApi: number }> {
  let byIdApi = 0;
  let byIdRequestStartedAt: number | null = null;
  const onByIdRequest = (request: import("@playwright/test").Request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/api/trpc") &&
      (request.url().includes("consortiums.byId") ||
        (request.postData() ?? "").includes("consortiums.byId"))
    ) {
      byIdRequestStartedAt = nodePerformance.now();
    }
  };
  page.on("request", onByIdRequest);
  const byIdPromise = page
    .waitForResponse((response) => isTrpcProcedure(response, "consortiums.byId"), {
      timeout: 60_000,
    })
    .then(() => {
      if (byIdRequestStartedAt != null) {
        byIdApi = elapsedMs(byIdRequestStartedAt);
      }
    })
    .catch(() => {
      byIdApi = 0;
    });

  await page.getByRole("button", { name: `Configurar ${currentName}` }).click();
  await page.getByRole("menuitem", { name: "Editar consorcio" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Editar consorcio" })).toBeVisible();

  // If byId was skipped (initial data), resolve quickly as 0.
  await Promise.race([byIdPromise, new Promise((resolve) => setTimeout(resolve, 1_500))]);
  page.off("request", onByIdRequest);

  const nameInput = dialog.getByLabel("Nombre del consorcio");
  await expect(nameInput).toHaveValue(currentName);
  await nameInput.fill(nextName);

  const {
    response: editApiResponse,
    durationMs: editApi,
    startedAt,
  } = await measureActionUntilResponse(
    page,
    (response) => isTrpcProcedure(response, "consortiums.update"),
    async () => {
      await dialog.getByRole("button", { name: "Guardar" }).click();
    },
  );

  if (!editApiResponse.ok()) {
    throw new Error(`consortiums.update failed: ${editApiResponse.status()}`);
  }

  await expect(page.getByText("Consorcio actualizado")).toBeVisible();
  await expect(page.getByText(nextName, { exact: true })).toBeVisible();

  return { editPerceived: elapsedMs(startedAt), editApi, byIdApi };
}

async function deleteConsortium(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: `Configurar ${name}` }).click();
  await page.getByRole("menuitem", { name: "Eliminar consorcio" }).click();
  await expect(page.getByRole("heading", { name: "Eliminar consorcio" })).toBeVisible();

  await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0, { timeout: 60_000 });
}

async function runIteration(
  page: Page,
  credentials: { email: string; password: string },
  index: number,
): Promise<{ metrics: IterationMetrics; vercelRegion: string | null }> {
  const stamp = `${Date.now()}-${index}`;
  const createName = `Perf ${stamp}`;
  const editName = `Perf edit ${stamp}`;

  const counter = attachRoundTripCounter(page);
  try {
    const home = await measureHomeNavigation(page);
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();

    const login = await loginAndMeasure(page, credentials);
    const create = await createConsortiumAndMeasure(page, createName);
    const edit = await editConsortiumAndMeasure(page, createName, editName);
    await deleteConsortium(page, editName);

    return {
      vercelRegion: home.vercelRegion,
      metrics: {
        ttfbHome: home.ttfbHome,
        domContentLoadedHome: home.domContentLoadedHome,
        loginApi: login.loginApi,
        loginPerceived: login.loginPerceived,
        loginNavigation: login.loginNavigation,
        listApi: login.listApi,
        createPerceived: create.createPerceived,
        createApi: create.createApi,
        editPerceived: edit.editPerceived,
        editApi: edit.editApi,
        byIdApi: edit.byIdApi,
        authRoundTrips: counter.auth,
        trpcRoundTrips: counter.trpc,
      },
    };
  } finally {
    counter.dispose();
  }
}

test.describe.configure({ mode: "serial" });

test("happy path latency: login → create → edit consortium", async ({ browser }, testInfo) => {
  const credentials = requireAdminCredentials();
  const target = String(testInfo.config.metadata.perfTarget ?? process.env.PERF_TARGET ?? "local");
  const baseURL = String(
    testInfo.config.metadata.baseURL ?? testInfo.project.use.baseURL ?? "http://localhost:3200",
  );
  const rubric = resolveRubric(target);

  // Remote: ~5 × (20–40s work) + 4 × 11s rate-limit waits ≈ 3–5 min.
  testInfo.setTimeout(target === "remote" ? 600_000 : 180_000);

  console.log(`perf target=${target} baseURL=${baseURL}`);

  if (target === "remote") {
    console.warn(
      "REMOTE: creates/edits/deletes real consortiums on the deployed DB (cleaned up per iteration).",
    );
  }

  const iterations: IterationMetrics[] = [];
  let vercelRegion: string | null = null;

  for (let index = 0; index < ITERATIONS; index += 1) {
    if (index > 0) {
      console.log(
        `waiting ${SIGN_IN_RATE_LIMIT_WINDOW_MS}ms for Better Auth sign-in rate limit window`,
      );
      await new Promise((resolve) => setTimeout(resolve, SIGN_IN_RATE_LIMIT_WINDOW_MS));
    }

    const context = await browser.newContext({
      serviceWorkers: "block",
    });
    const page = await context.newPage();

    try {
      const { metrics, vercelRegion: iterationRegion } = await runIteration(
        page,
        credentials,
        index,
      );
      if (!vercelRegion && iterationRegion) {
        vercelRegion = iterationRegion;
      }
      iterations.push(metrics);
      console.log(
        `iteration ${index + 1}/${ITERATIONS}: login=${metrics.loginPerceived}ms (api=${metrics.loginApi}ms) create=${metrics.createPerceived}ms edit=${metrics.editPerceived}ms list=${metrics.listApi}ms byId=${metrics.byIdApi}ms authRT=${metrics.authRoundTrips} trpcRT=${metrics.trpcRoundTrips}`,
      );
    } finally {
      await context.close();
    }
  }

  if (vercelRegion) {
    console.log(`x-vercel-id=${vercelRegion}`);
  }

  const summaries = summarize(iterations, rubric);
  printReport(summaries, { target, baseURL });

  const resultsPath = writeResultsJson({
    generatedAt: new Date().toISOString(),
    target,
    baseURL,
    vercelRegion,
    iterationCount: iterations.length,
    iterations,
    summaries,
  });
  console.log(`results written to ${resultsPath}`);

  assertAgainstRubric(summaries, rubric);
});
