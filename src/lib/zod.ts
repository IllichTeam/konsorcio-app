import * as z from "zod";

/**
 * Global Zod setup. `z.config()` mutates Zod's process-wide configuration, so
 * applying the Spanish locale here makes every schema's default validation
 * message Spanish (these messages surface to users in forms) without repeating
 * a `message` on each rule.
 *
 * Always import Zod from this module — `import { z } from "@/lib/zod"` — never
 * from "zod" directly, so the locale is guaranteed to be applied before any
 * schema parses. Pass an explicit `message` only when the default wording is
 * not good enough for a given field.
 */
z.config(z.locales.es());

export { z };
