import { db } from "@/db";
import {
  consortiumActivities,
  type ConsortiumActivityPayload,
  type ConsortiumActivityType,
} from "@/db/schema";

export type RecordConsortiumActivityInput = {
  consortiumId: string;
  actorUserId?: string | null;
  type: ConsortiumActivityType;
  summary: string;
  payload?: ConsortiumActivityPayload;
};

/**
 * Inserts one curated history row. Soft-fails on DB errors so callers' primary
 * mutations (update, send, expense create) are not blocked by telemetry.
 */
export async function recordConsortiumActivity(
  input: RecordConsortiumActivityInput,
): Promise<void> {
  try {
    await db.insert(consortiumActivities).values({
      consortiumId: input.consortiumId,
      actorUserId: input.actorUserId ?? null,
      type: input.type,
      summary: input.summary,
      payload: input.payload ?? {},
    });
  } catch (error) {
    console.error("Failed to record consortium activity", {
      consortiumId: input.consortiumId,
      type: input.type,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
