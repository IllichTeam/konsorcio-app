import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  ASSERTED_METRICS,
  getRubric,
  type MetricKey,
  type PerfTarget,
  type Rubric,
  type Verdict,
  verdictFor,
} from "./rubric";

export type IterationMetrics = Record<MetricKey, number>;

export type MetricSummary = {
  key: MetricKey;
  label: string;
  medianMs: number;
  p95Ms: number;
  verdict: Verdict;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  if (sorted.length === 1) return sorted[0]!;
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low]!;
  const weight = rank - low;
  return sorted[low]! * (1 - weight) + sorted[high]! * weight;
}

export function median(values: number[]): number {
  const sorted = [...values].toSorted((a, b) => a - b);
  return percentile(sorted, 50);
}

export function p95(values: number[]): number {
  const sorted = [...values].toSorted((a, b) => a - b);
  return percentile(sorted, 95);
}

export function summarize(iterations: IterationMetrics[], rubric: Rubric): MetricSummary[] {
  const keys = Object.keys(rubric) as MetricKey[];

  return keys.map((key) => {
    const values = iterations.map((iteration) => iteration[key]);
    const medianMs = Math.round(median(values));
    const p95Ms = Math.round(p95(values));
    const budget = rubric[key];

    return {
      key,
      label: budget.label,
      medianMs,
      p95Ms,
      verdict: verdictFor(medianMs, budget),
    };
  });
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : `${value}${" ".repeat(width - value.length)}`;
}

export function printReport(
  summaries: MetricSummary[],
  meta?: { target: string; baseURL: string },
): void {
  const header = [
    pad("Métrica", 28),
    pad("Mediana", 10),
    pad("p95", 10),
    pad("Veredicto", 10),
  ].join("  ");

  console.log("\n=== Perf happy path ===");
  if (meta) {
    console.log(`target=${meta.target}  baseURL=${meta.baseURL}`);
  }
  console.log(header);
  console.log("-".repeat(header.length));

  for (const row of summaries) {
    const line = [
      pad(row.label, 28),
      pad(`${row.medianMs} ms`, 10),
      pad(`${row.p95Ms} ms`, 10),
      pad(row.verdict.toUpperCase(), 10),
    ].join("  ");
    console.log(line);

    if (row.verdict === "yellow") {
      console.warn(`  ⚠ ${row.label}: mediana en amarillo (${row.medianMs} ms)`);
    }
  }

  console.log("");
}

export function writeResultsJson(payload: {
  generatedAt: string;
  target: string;
  baseURL: string;
  iterationCount: number;
  iterations: IterationMetrics[];
  summaries: MetricSummary[];
  /** Parsed from `x-vercel-id` when present (e.g. `gru1::iad1::…`). */
  vercelRegion?: string | null;
}): string {
  const resultsDir = path.join(process.cwd(), "e2e/perf/results");
  mkdirSync(resultsDir, { recursive: true });

  const stamp = payload.generatedAt.replaceAll(":", "-");
  const filePath = path.join(resultsDir, `happy-path-${payload.target}-${stamp}.json`);
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filePath;
}

export function assertAgainstRubric(summaries: MetricSummary[], rubric: Rubric): void {
  const failures = summaries.filter(
    (row) => ASSERTED_METRICS.includes(row.key) && row.verdict === "red",
  );

  if (failures.length === 0) return;

  const detail = failures
    .map((row) => {
      const budget = rubric[row.key];
      return `${row.label}: mediana ${row.medianMs} ms (rojo ≥ ${budget.yellowMs} ms)`;
    })
    .join("\n  - ");

  throw new Error(`Presupuestos de performance en rojo:\n  - ${detail}`);
}

export function resolveRubric(target: string): Rubric {
  const normalized: PerfTarget = target === "remote" ? "remote" : "local";
  return getRubric(normalized);
}
