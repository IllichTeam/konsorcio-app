import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

/** Prefer São Paulo (near Supabase). Project default also set in vercel.json. */
export const preferredRegion = "gru1";

export const { GET, POST } = toNextJsHandler(auth);
