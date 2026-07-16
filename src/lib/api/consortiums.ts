import type { ConsortiumHistoryEntry, CreateConsortiumCommentInput } from "@/types/consortium";

const MOCK_HISTORY: Record<string, ConsortiumHistoryEntry[]> = {};

/** Action history — mock until history is modeled. */
export async function getConsortiumHistory(id: string): Promise<ConsortiumHistoryEntry[]> {
  return MOCK_HISTORY[id] ?? [];
}

/** Quick comment — mock until comments are modeled. */
export async function createConsortiumComment(input: CreateConsortiumCommentInput): Promise<void> {
  void input;
}
