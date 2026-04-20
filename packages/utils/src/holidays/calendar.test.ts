import { describe, expect, it } from "vitest";

import { computeHolidayCalendar, computeIslamicHolidays } from "./calendar.js";
import { FIXED_HOLIDAYS, LUNAR_HOLIDAYS } from "./holiday-types.js";

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

// REGAİB KANDİLİ is not computed because it depends on weekday arithmetic
// (first Thursday of Receb) and has no fixed Hijri day.

describe("computeIslamicHolidays — 2024 (Hijri 1445)", () => {
  it("Üç Aylar başlangıcı — Receb 1, 1445 (library: 2024-01-13, Diyanet override: 2024-01-12)", () => {
    expect(toISO(computeIslamicHolidays(2024).ucAylari)).toBe("2024-01-13");
  });

  it("Mirac Kandili — Receb 26, 1445 (library: 2024-02-07, Diyanet override: 2024-02-06)", () => {
    expect(toISO(computeIslamicHolidays(2024).mirac)).toBe("2024-02-07");
  });

  it("Berat Kandili — Şaban 14, 1445 = 2024-02-24", () => {
    expect(toISO(computeIslamicHolidays(2024).berat)).toBe("2024-02-24");
  });

  it("Ramazan başlangıcı — Ramazan 1, 1445 = 2024-03-11", () => {
    expect(toISO(computeIslamicHolidays(2024).ramazanStart)).toBe("2024-03-11");
  });

  it("Kadir Gecesi — Ramazan 26, 1445 = 2024-04-05", () => {
    expect(toISO(computeIslamicHolidays(2024).kadirGecesi)).toBe("2024-04-05");
  });

  it("Ramazan sonu (Arefe) — Ramazan 30, 1445 = 2024-04-09", () => {
    expect(toISO(computeIslamicHolidays(2024).ramazanEnd)).toBe("2024-04-09");
  });

  it("Ramazan Bayramı 1. Gün — Şevval 1, 1445 = 2024-04-10", () => {
    expect(toISO(computeIslamicHolidays(2024).ramazanBayramiStart)).toBe(
      "2024-04-10",
    );
  });

  it("Ramazan Bayramı 3. Gün — Şevval 3, 1445 = 2024-04-12", () => {
    expect(toISO(computeIslamicHolidays(2024).ramazanBayramiEnd)).toBe(
      "2024-04-12",
    );
  });

  it("Kurban Arefesi — Zülhicce 9, 1445 = 2024-06-15", () => {
    expect(toISO(computeIslamicHolidays(2024).kurbanArefesi)).toBe(
      "2024-06-15",
    );
  });

  it("Kurban Bayramı 1. Gün — Zülhicce 10, 1445 = 2024-06-16", () => {
    expect(toISO(computeIslamicHolidays(2024).kurbanBayramiStart)).toBe(
      "2024-06-16",
    );
  });

  it("Kurban Bayramı 4. Gün — Zülhicce 13, 1445 = 2024-06-19", () => {
    expect(toISO(computeIslamicHolidays(2024).kurbanBayramiEnd)).toBe(
      "2024-06-19",
    );
  });

  it("Hicri Yılbaşı — Muharrem 1, 1446 = 2024-07-07", () => {
    expect(toISO(computeIslamicHolidays(2024).hicriYilbasi)).toBe("2024-07-07");
  });

  it("Aşure Günü — Muharrem 10, 1446 = 2024-07-16", () => {
    expect(toISO(computeIslamicHolidays(2024).asure)).toBe("2024-07-16");
  });

  it("Mevlid Kandili — Rebiülevvel 11, 1446 = 2024-09-14", () => {
    expect(toISO(computeIslamicHolidays(2024).mevlid)).toBe("2024-09-14");
  });
});

describe("computeIslamicHolidays — 2025 (Hijri 1446)", () => {
  it("Üç Aylar başlangıcı — Receb 1, 1446 = 2025-01-01", () => {
    expect(toISO(computeIslamicHolidays(2025).ucAylari)).toBe("2025-01-01");
  });

  it("Mirac Kandili — Receb 26, 1446 = 2025-01-26", () => {
    expect(toISO(computeIslamicHolidays(2025).mirac)).toBe("2025-01-26");
  });

  it("Berat Kandili — Şaban 14, 1446 = 2025-02-13", () => {
    expect(toISO(computeIslamicHolidays(2025).berat)).toBe("2025-02-13");
  });

  it("Ramazan başlangıcı — Ramazan 1, 1446 = 2025-03-01", () => {
    expect(toISO(computeIslamicHolidays(2025).ramazanStart)).toBe("2025-03-01");
  });

  it("Kadir Gecesi — Ramazan 26, 1446 = 2025-03-26", () => {
    expect(toISO(computeIslamicHolidays(2025).kadirGecesi)).toBe("2025-03-26");
  });

  it("Ramazan sonu (Arefe) — Ramazan 29, 1446 = 2025-03-29", () => {
    expect(toISO(computeIslamicHolidays(2025).ramazanEnd)).toBe("2025-03-29");
  });

  it("Ramazan Bayramı 1. Gün — Şevval 1, 1446 = 2025-03-30", () => {
    expect(toISO(computeIslamicHolidays(2025).ramazanBayramiStart)).toBe(
      "2025-03-30",
    );
  });

  it("Ramazan Bayramı 3. Gün — Şevval 3, 1446 = 2025-04-01", () => {
    expect(toISO(computeIslamicHolidays(2025).ramazanBayramiEnd)).toBe(
      "2025-04-01",
    );
  });

  it("Kurban Arefesi — Zülhicce 9, 1446 = 2025-06-05", () => {
    expect(toISO(computeIslamicHolidays(2025).kurbanArefesi)).toBe(
      "2025-06-05",
    );
  });

  it("Kurban Bayramı 1. Gün — Zülhicce 10, 1446 = 2025-06-06", () => {
    expect(toISO(computeIslamicHolidays(2025).kurbanBayramiStart)).toBe(
      "2025-06-06",
    );
  });

  it("Kurban Bayramı 4. Gün — Zülhicce 13, 1446 = 2025-06-09", () => {
    expect(toISO(computeIslamicHolidays(2025).kurbanBayramiEnd)).toBe(
      "2025-06-09",
    );
  });

  it("Hicri Yılbaşı — Muharrem 1, 1447 = 2025-06-26", () => {
    expect(toISO(computeIslamicHolidays(2025).hicriYilbasi)).toBe("2025-06-26");
  });

  it("Aşure Günü — Muharrem 10, 1447 = 2025-07-05", () => {
    expect(toISO(computeIslamicHolidays(2025).asure)).toBe("2025-07-05");
  });

  it("Mevlid Kandili — Rebiülevvel 11, 1447 = 2025-09-03", () => {
    expect(toISO(computeIslamicHolidays(2025).mevlid)).toBe("2025-09-03");
  });
});

describe("computeIslamicHolidays — 2026 (Hijri 1447)", () => {
  it("Üç Aylar başlangıcı — Receb 1, 1447 = 2025-12-21 (falls in prior year)", () => {
    expect(toISO(computeIslamicHolidays(2026).ucAylari)).toBe("2025-12-21");
  });

  it("Mirac Kandili — Receb 26, 1447 = 2026-01-15", () => {
    expect(toISO(computeIslamicHolidays(2026).mirac)).toBe("2026-01-15");
  });

  it("Berat Kandili — Şaban 14, 1447 = 2026-02-02", () => {
    expect(toISO(computeIslamicHolidays(2026).berat)).toBe("2026-02-02");
  });

  it("Ramazan başlangıcı — Ramazan 1, 1447 (library: 2026-02-18, Diyanet override: 2026-02-19)", () => {
    expect(toISO(computeIslamicHolidays(2026).ramazanStart)).toBe("2026-02-18");
  });

  it("Kadir Gecesi — Ramazan 26, 1447 (library: 2026-03-15, Diyanet override: 2026-03-16)", () => {
    expect(toISO(computeIslamicHolidays(2026).kadirGecesi)).toBe("2026-03-15");
  });

  it("Ramazan sonu (Arefe) — Ramazan 29, 1447 = 2026-03-19", () => {
    expect(toISO(computeIslamicHolidays(2026).ramazanEnd)).toBe("2026-03-19");
  });

  it("Ramazan Bayramı 1. Gün — Şevval 1, 1447 = 2026-03-20", () => {
    expect(toISO(computeIslamicHolidays(2026).ramazanBayramiStart)).toBe(
      "2026-03-20",
    );
  });

  it("Ramazan Bayramı 3. Gün — Şevval 3, 1447 = 2026-03-22", () => {
    expect(toISO(computeIslamicHolidays(2026).ramazanBayramiEnd)).toBe(
      "2026-03-22",
    );
  });

  it("Kurban Arefesi — Zülhicce 9, 1447 = 2026-05-26", () => {
    expect(toISO(computeIslamicHolidays(2026).kurbanArefesi)).toBe(
      "2026-05-26",
    );
  });

  it("Kurban Bayramı 1. Gün — Zülhicce 10, 1447 = 2026-05-27", () => {
    expect(toISO(computeIslamicHolidays(2026).kurbanBayramiStart)).toBe(
      "2026-05-27",
    );
  });

  it("Kurban Bayramı 4. Gün — Zülhicce 13, 1447 = 2026-05-30", () => {
    expect(toISO(computeIslamicHolidays(2026).kurbanBayramiEnd)).toBe(
      "2026-05-30",
    );
  });

  it("Hicri Yılbaşı — Muharrem 1, 1448 = 2026-06-16", () => {
    expect(toISO(computeIslamicHolidays(2026).hicriYilbasi)).toBe("2026-06-16");
  });

  it("Aşure Günü — Muharrem 10, 1448 = 2026-06-25", () => {
    expect(toISO(computeIslamicHolidays(2026).asure)).toBe("2026-06-25");
  });

  it("Mevlid Kandili — Rebiülevvel 11, 1448 = 2026-08-24", () => {
    expect(toISO(computeIslamicHolidays(2026).mevlid)).toBe("2026-08-24");
  });
});

// ─── Structural invariants ────────────────────────────────────────────────────

describe("computeIslamicHolidays — structural invariants", () => {
  it("returns all 14 fields", () => {
    const r = computeIslamicHolidays(2026);
    const fields: (keyof typeof r)[] = [
      "ucAylari",
      "mirac",
      "berat",
      "ramazanStart",
      "kadirGecesi",
      "ramazanEnd",
      "ramazanBayramiStart",
      "ramazanBayramiEnd",
      "kurbanArefesi",
      "kurbanBayramiStart",
      "kurbanBayramiEnd",
      "hicriYilbasi",
      "asure",
      "mevlid",
    ];
    for (const f of fields) expect(r).toHaveProperty(f);
  });

  it("ramazan spans 29 or 30 days", () => {
    for (const year of [2024, 2025, 2026]) {
      const { ramazanStart, ramazanEnd } = computeIslamicHolidays(year);
      const days =
        (ramazanEnd.getTime() - ramazanStart.getTime()) / 86400000 + 1;
      expect([29, 30], `year ${year}`).toContain(days);
    }
  });

  it("ramazan ends the day before bayram starts", () => {
    for (const year of [2024, 2025, 2026]) {
      const { ramazanEnd, ramazanBayramiStart } = computeIslamicHolidays(year);
      const gap =
        (ramazanBayramiStart.getTime() - ramazanEnd.getTime()) / 86400000;
      expect(gap, `year ${year}`).toBe(1);
    }
  });

  it("ramazan bayramı spans exactly 3 days", () => {
    for (const year of [2024, 2025, 2026]) {
      const { ramazanBayramiStart, ramazanBayramiEnd } =
        computeIslamicHolidays(year);
      const days =
        (ramazanBayramiEnd.getTime() - ramazanBayramiStart.getTime()) /
          86400000 +
        1;
      expect(days, `year ${year}`).toBe(3);
    }
  });

  it("kurban arefesi is the day before kurban bayramı", () => {
    for (const year of [2024, 2025, 2026]) {
      const { kurbanArefesi, kurbanBayramiStart } =
        computeIslamicHolidays(year);
      const gap =
        (kurbanBayramiStart.getTime() - kurbanArefesi.getTime()) / 86400000;
      expect(gap, `year ${year}`).toBe(1);
    }
  });

  it("kurban bayramı spans exactly 4 days", () => {
    for (const year of [2024, 2025, 2026]) {
      const { kurbanBayramiStart, kurbanBayramiEnd } =
        computeIslamicHolidays(year);
      const days =
        (kurbanBayramiEnd.getTime() - kurbanBayramiStart.getTime()) / 86400000 +
        1;
      expect(days, `year ${year}`).toBe(4);
    }
  });

  it("produces different dates across years", () => {
    const r2025 = computeIslamicHolidays(2025);
    const r2026 = computeIslamicHolidays(2026);
    expect(r2025.ramazanStart.getTime()).not.toBe(r2026.ramazanStart.getTime());
  });
});

// ─── computeHolidayCalendar ───────────────────────────────────────────────────

describe("computeHolidayCalendar", () => {
  function byName(year: number, holidayTypeName: string) {
    const entry = computeHolidayCalendar(year).find(
      (e) => e.holidayTypeName === holidayTypeName,
    );
    expect(entry, `missing holiday: ${holidayTypeName}`).toBeDefined();
    return entry!;
  }

  function expectRangeIso(
    year: number,
    holidayTypeName: string,
    startIso: string,
    endIso: string,
  ) {
    const entry = byName(year, holidayTypeName);
    expect(toISO(entry.startDate)).toBe(startIso);
    expect(toISO(entry.endDate)).toBe(endIso);
  }

  it("returns one entry per holiday type", () => {
    const calendar = computeHolidayCalendar(2026);
    const expectedCount = FIXED_HOLIDAYS.length + LUNAR_HOLIDAYS.length;
    expect(calendar).toHaveLength(expectedCount);
  });

  it("includes all fixed holiday names", () => {
    const calendar = computeHolidayCalendar(2026);
    const names = calendar.map((e) => e.holidayTypeName);
    for (const h of FIXED_HOLIDAYS) {
      expect(names).toContain(h.name);
    }
  });

  it("includes all lunar holiday names", () => {
    const calendar = computeHolidayCalendar(2026);
    const names = calendar.map((e) => e.holidayTypeName);
    for (const h of LUNAR_HOLIDAYS) {
      expect(names).toContain(h.name);
    }
  });

  it("fixed holidays fall on the correct month and day", () => {
    const calendar = computeHolidayCalendar(2026);
    for (const fixed of FIXED_HOLIDAYS) {
      const entry = calendar.find((e) => e.holidayTypeName === fixed.name);
      expect(entry).toBeDefined();
      expect(entry!.startDate.getUTCMonth() + 1).toBe(fixed.month);
      expect(entry!.startDate.getUTCDate()).toBe(fixed.day);
      expect(entry!.endDate.getUTCMonth() + 1).toBe(fixed.month);
      expect(entry!.endDate.getUTCDate()).toBe(fixed.day);
    }
  });

  it("all entries have startDate <= endDate", () => {
    const calendar = computeHolidayCalendar(2026);
    for (const entry of calendar) {
      expect(entry.startDate <= entry.endDate).toBe(true);
    }
  });

  it("applies 2024 Diyanet overrides for Üç Aylar and Mirac Kandili", () => {
    expectRangeIso(2024, "Üç Aylar",      "2024-01-12", "2024-01-12");
    expectRangeIso(2024, "Mirac Kandili", "2024-02-06", "2024-02-06");
  });

  it("applies 2026 Diyanet overrides for Ramazan Ayı and Kadir Gecesi", () => {
    expectRangeIso(2026, "Ramazan Ayı",  "2026-02-19", "2026-03-19");
    expectRangeIso(2026, "Kadir Gecesi", "2026-03-16", "2026-03-16");
  });

  it("matches 2026 official public and religious holiday calendar", () => {
    expectRangeIso(2026, "1 Ocak — Yılbaşı", "2026-01-01", "2026-01-01");
    expectRangeIso(2026, "Ramazan Ayı", "2026-02-19", "2026-03-19"); // Arefe
    expectRangeIso(2026, "Ramazan Bayramı", "2026-03-20", "2026-03-22");
    expectRangeIso(
      2026,
      "23 Nisan — Ulusal Egemenlik",
      "2026-04-23",
      "2026-04-23",
    );
    expectRangeIso(
      2026,
      "1 Mayıs — Emek ve Dayanışma",
      "2026-05-01",
      "2026-05-01",
    );
    expectRangeIso(
      2026,
      "19 Mayıs — Atatürk'ü Anma",
      "2026-05-19",
      "2026-05-19",
    );
    expectRangeIso(2026, "Kurban Arefesi", "2026-05-26", "2026-05-26");
    expectRangeIso(2026, "Kurban Bayramı", "2026-05-27", "2026-05-30");
    expectRangeIso(2026, "15 Temmuz — Demokrasi", "2026-07-15", "2026-07-15");
    expectRangeIso(
      2026,
      "30 Ağustos — Zafer Bayramı",
      "2026-08-30",
      "2026-08-30",
    );
    expectRangeIso(
      2026,
      "29 Ekim — Cumhuriyet Bayramı",
      "2026-10-29",
      "2026-10-29",
    );
  });
});
