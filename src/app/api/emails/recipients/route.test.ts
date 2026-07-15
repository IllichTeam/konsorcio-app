import { describe, expect, it, vi } from "vitest";

import type { Session } from "@/lib/auth/session";
import type { EmailRecipient } from "@/lib/email/recipients";

// The route guards access via `getSession()`; mocking it lets each test drive
// the auth state (no session / non-admin / admin) without wiring a full
// better-auth request/cookie flow.
vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

// `listRecipients` (in `@/lib/email/recipients`) starts with `import
// "server-only"`, which throws when imported in this test's jsdom
// environment (see `src/lib/email/send.test.ts` for the same pattern with
// `@/lib/email/client`). Mock it out so the route can be exercised without
// pulling in the real db-backed implementation.
vi.mock("@/lib/email/recipients", () => ({
  listRecipients: vi.fn(),
}));

// Imported after the mocks above so they pick up the mocked modules.
const { getSession } = await import("@/lib/auth/session");
const { listRecipients } = await import("@/lib/email/recipients");
const { GET } = await import("./route");

function fakeSession(role: "admin" | "user"): Session {
  return {
    user: {
      id: `user-${role}`,
      name: `${role} user`,
      email: `${role}@example.com`,
      role,
    },
    session: {
      id: "session-id",
    },
  } as unknown as Session;
}

const sampleRecipients: EmailRecipient[] = [
  { id: "user-alice", name: "Alice", email: "alice@example.com" },
  { id: "user-charlie", name: "Charlie", email: "charlie@example.com" },
];

describe("GET /api/emails/recipients", () => {
  it("returns 401 when there is no session", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/emails/recipients"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: expect.any(String) });
    expect(listRecipients).not.toHaveBeenCalled();
  });

  it("returns 403 when the session user is not an admin", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(fakeSession("user"));

    const response = await GET(new Request("http://localhost/api/emails/recipients"));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: expect.any(String) });
    expect(listRecipients).not.toHaveBeenCalled();
  });

  it("returns 200 with the recipients list for an admin session", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(fakeSession("admin"));
    vi.mocked(listRecipients).mockResolvedValueOnce(sampleRecipients);

    const response = await GET(new Request("http://localhost/api/emails/recipients"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ recipients: sampleRecipients });
    for (const recipient of body.recipients) {
      expect(recipient).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          email: expect.any(String),
        }),
      );
    }
  });
});
