import { formatDate, formatDateTime, formatDateTimeAmPm } from "@/lib/format-date";

describe("formatDate", () => {
  it("formats ISO date strings as DD/MM/YYYY with zero-padding", () => {
    expect(formatDate("2026-07-23")).toBe("23/07/2026");
    expect(formatDate("2026-07-23T12:00:00.000Z")).toBe("23/07/2026");
  });

  it("formats Date instances", () => {
    expect(formatDate(new Date(2026, 6, 23))).toBe("23/07/2026");
  });

  it("returns an em dash for null, empty, or invalid values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("")).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDate(new Date("invalid"))).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("formats local date and 24h time as DD/MM/YYYY HH:mm", () => {
    const local = new Date(2026, 6, 23, 9, 12);
    expect(formatDateTime(local)).toBe("23/07/2026 09:12");
  });

  it("formats ISO datetimes in local timezone", () => {
    const result = formatDateTime("2026-07-23T12:34:56.000Z");
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it("returns an em dash for null, empty, or invalid values", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDateTime("")).toBe("—");
    expect(formatDateTime("not-a-date")).toBe("—");
  });
});

describe("formatDateTimeAmPm", () => {
  it("formats with dash separator and AM/PM", () => {
    expect(formatDateTimeAmPm(new Date(2026, 6, 23, 5, 48))).toBe("23/07/2026 - 5:48 AM");
    expect(formatDateTimeAmPm(new Date(2026, 6, 23, 17, 48))).toBe("23/07/2026 - 5:48 PM");
  });

  it("returns an em dash for invalid values", () => {
    expect(formatDateTimeAmPm(null)).toBe("—");
    expect(formatDateTimeAmPm("not-a-date")).toBe("—");
  });
});
