import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildExpenseEmailObjectKey,
  buildExpenseEmailStoragePath,
  isAttachmentRefForSend,
  isPdfFile,
  normalizeDisplayFilename,
  sanitizeExpenseEmailObjectFilename,
  storagePathToObjectKey,
} from "./expense-emails";

const consortiumId = "11111111-1111-4111-8111-111111111111";
const sendId = "22222222-2222-4222-8222-222222222222";

describe("expense email storage helpers", () => {
  it("builds object keys without repeating the bucket name", () => {
    expect(buildExpenseEmailObjectKey(consortiumId, sendId, "a.pdf")).toBe(
      `${consortiumId}/${sendId}/a.pdf`,
    );
    expect(buildExpenseEmailStoragePath(consortiumId, sendId, "a.pdf")).toBe(
      `expense-emails/${consortiumId}/${sendId}/a.pdf`,
    );
    expect(storagePathToObjectKey(`expense-emails/${consortiumId}/${sendId}/a.pdf`)).toBe(
      `${consortiumId}/${sendId}/a.pdf`,
    );
  });

  it("gates attachment refs to the reserved send path", () => {
    const ok = {
      storagePath: `expense-emails/${consortiumId}/${sendId}/expensa.pdf`,
    };
    expect(isAttachmentRefForSend(ok, consortiumId, sendId)).toBe(true);
    expect(
      isAttachmentRefForSend(
        { storagePath: `expense-emails/other/${sendId}/expensa.pdf` },
        consortiumId,
        sendId,
      ),
    ).toBe(false);
    expect(
      isAttachmentRefForSend(
        { storagePath: `expense-emails/${consortiumId}/${sendId}/nested/expensa.pdf` },
        consortiumId,
        sendId,
      ),
    ).toBe(false);
    expect(
      isAttachmentRefForSend(
        { storagePath: `expense-emails/${consortiumId}/${sendId}/../x.pdf` },
        consortiumId,
        sendId,
      ),
    ).toBe(false);
  });

  it("sanitizes filenames, forces .pdf, and de-dupes collisions", () => {
    const used = new Set<string>();
    expect(sanitizeExpenseEmailObjectFilename("../../etc/passwd", used)).toBe("passwd.pdf");
    expect(sanitizeExpenseEmailObjectFilename("Expensa Marzo.pdf", used)).toBe("Expensa_Marzo.pdf");
    expect(sanitizeExpenseEmailObjectFilename("Expensa Marzo.pdf", used)).toBe(
      "Expensa_Marzo-2.pdf",
    );
    expect(sanitizeExpenseEmailObjectFilename("sin-ext", used)).toBe("sin-ext.pdf");
    expect(normalizeDisplayFilename("carpeta/Liquidación.pdf")).toBe("Liquidación.pdf");
  });

  it("detects PDFs by magic bytes and rejects wrong MIME", async () => {
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "a.pdf", {
      type: "application/pdf",
    });
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "a.png", {
      type: "image/png",
    });
    const lied = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "a.pdf", {
      type: "application/pdf",
    });

    expect(await isPdfFile(pdf)).toBe(true);
    expect(await isPdfFile(png)).toBe(false);
    expect(await isPdfFile(lied)).toBe(false);
  });
});
