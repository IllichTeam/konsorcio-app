import type { ConsortiumHistoryEntry } from "@/types/consortium";

const MOCK_HISTORY: Record<string, ConsortiumHistoryEntry[]> = {};

/** Action history — mock until history is modeled. */
export async function getConsortiumHistory(id: string): Promise<ConsortiumHistoryEntry[]> {
  return MOCK_HISTORY[id] ?? [];
}
