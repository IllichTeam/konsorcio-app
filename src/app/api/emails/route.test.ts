import { describe, expect, it, vi } from "vitest";

import type { Session } from "@/lib/auth/session";
import type { SendEmailResult } from "@/lib/email/types";

// The route guards access via `getSession()`; mocking it lets each test drive
// the auth state (no session / non-admin / admin) without wiring a full
// better-auth request/cookie flow.
vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

// `sendEmail` (in `@/lib/email/send`) starts with `import "server-only"`,
// which throws when imported in this test's jsdom environment (see
// `src/lib/email/send.test.ts` for the same pattern). Mock it out so the
// route can be exercised without pulling in the real Resend-backed
// implementation.
vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(),
}));

// `@/db` opens a real Postgres/PGlite connection at module load. Mock it so
// tests don't need a real database — only `db.insert(...).values(...)` is
// exercised by the route.
const insertValuesMock = vi.fn().mockResolvedValue(undefined);
const insertMock = vi.fn(() => ({ values: insertValuesMock }));

vi.mock("@/db", () => ({
  db: { insert: insertMock },
}));

// Imported after the mocks above so they pick up the mocked modules.
const { getSession } = await import("@/lib/auth/session");
const { sendEmail } = await import("@/lib/email/send");
const { POST } = await import("./route");

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

const validBody = {
  subject: "Aviso importante",
  body: "Contenido del correo",
  recipients: [{ email: "alice@example.com", name: "Alice" }],
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/emails", () => {
  it("returns 401 when there is no session", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(null);

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(401);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: expect.any(String) });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns 403 when the session user is not an admin", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(fakeSession("user"));

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(403);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: expect.any(String) });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns 400 when subject is missing", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(fakeSession("admin"));

    const response = await POST(postRequest({ ...validBody, subject: undefined }));

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: expect.any(String) });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns 400 when recipients is empty", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(fakeSession("admin"));

    const response = await POST(postRequest({ ...validBody, recipients: [] }));

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: expect.any(String) });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns 400 when a recipient email is invalid", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(fakeSession("admin"));

    const response = await POST(
      postRequest({ ...validBody, recipients: [{ email: "not-an-email" }] }),
    );

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ error: expect.any(String) });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns 200, sends the email, and logs it for an admin session", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(fakeSession("admin"));
    const result: SendEmailResult = {
      status: "sent",
      sent: 1,
      failed: 0,
      resendIds: ["resend-1"],
    };
    vi.mocked(sendEmail).mockResolvedValueOnce(result);

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ status: "sent", sent: 1, failed: 0 });
    expect(sendEmail).toHaveBeenCalledWith(validBody);
    expect(insertMock).toHaveBeenCalled();
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: validBody.subject,
        body: validBody.body,
        recipients: validBody.recipients,
        recipientCount: validBody.recipients.length,
        status: "sent",
        resendIds: ["resend-1"],
        error: null,
        sentByUserId: "user-admin",
      }),
    );
  });

  it("returns 502 when sendEmail reports a failed status", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(fakeSession("admin"));
    const result: SendEmailResult = {
      status: "failed",
      sent: 0,
      failed: 1,
      resendIds: [],
      error: "Resend error",
    };
    vi.mocked(sendEmail).mockResolvedValueOnce(result);

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(502);
    const responseBody = await response.json();
    expect(responseBody).toEqual(expect.objectContaining({ error: expect.any(String), ...result }));
  });

  it("still returns 200 when persisting the email log throws", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(fakeSession("admin"));
    const result: SendEmailResult = {
      status: "sent",
      sent: 1,
      failed: 0,
      resendIds: ["resend-1"],
    };
    vi.mocked(sendEmail).mockResolvedValueOnce(result);
    insertValuesMock.mockRejectedValueOnce(new Error("db down"));

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody).toEqual({ status: "sent", sent: 1, failed: 0 });
  });
});
