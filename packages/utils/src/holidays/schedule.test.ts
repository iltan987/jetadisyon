import { describe, expect, it } from "vitest";

import type { ScheduleResolutionContext } from "./schedule.js";
import { previewSchedule, resolveEffectiveSchedule } from "./schedule.js";

const NISAN_23 = "23 Nisan \u2014 Ulusal Egemenlik";

const monday = new Date(Date.UTC(2026, 3, 20)); // Monday 2026-04-20
const tuesday = new Date(Date.UTC(2026, 3, 21)); // Tuesday 2026-04-21

const baseContext: ScheduleResolutionContext = {
  weeklySchedule: [
    { dayOfWeek: 1, isOpen: true, startTime: "09:00", endTime: "22:00" }, // Monday
    { dayOfWeek: 2, isOpen: true, startTime: "09:00", endTime: "22:00" }, // Tuesday
    { dayOfWeek: 0, isOpen: false, startTime: "00:00", endTime: "00:00" }, // Sunday
  ],
  workingDayOverrides: [],
  holidayPolicies: [],
  calendarEntries: [],
};

// ─── Weekly schedule (priority 3) ────────────────────────────────────────────

describe("resolveEffectiveSchedule — weekly fallback", () => {
  it("returns open with weekly hours on a working day", () => {
    const result = resolveEffectiveSchedule(monday, baseContext);
    expect(result).toEqual({
      status: "open",
      startTime: "09:00",
      endTime: "22:00",
      source: "weekly",
    });
  });

  it("returns closed on a day marked isOpen=false", () => {
    const sunday = new Date(Date.UTC(2026, 3, 19)); // Sunday
    const result = resolveEffectiveSchedule(sunday, baseContext);
    expect(result).toEqual({ status: "closed", source: "weekly" });
  });

  it("returns closed when no weekly entry exists for the day", () => {
    const saturday = new Date(Date.UTC(2026, 3, 25)); // Saturday
    const result = resolveEffectiveSchedule(saturday, baseContext);
    expect(result).toEqual({ status: "closed", source: "weekly" });
  });
});

// ─── Holiday policy (priority 2) ─────────────────────────────────────────────

describe("resolveEffectiveSchedule — holiday policy", () => {
  const ctx: ScheduleResolutionContext = {
    ...baseContext,
    calendarEntries: [
      {
        holidayTypeName: NISAN_23,
        startDate: new Date(Date.UTC(2026, 3, 20)),
        endDate: new Date(Date.UTC(2026, 3, 20)),
      },
    ],
    holidayPolicies: [{ holidayTypeName: NISAN_23, effect: "closed" }],
  };

  it("returns closed from holiday_policy when policy effect is closed", () => {
    const result = resolveEffectiveSchedule(monday, ctx);
    expect(result).toEqual({ status: "closed", source: "holiday_policy" });
  });

  it("returns open with custom hours when policy effect is custom_hours", () => {
    const customCtx: ScheduleResolutionContext = {
      ...ctx,
      holidayPolicies: [
        {
          holidayTypeName: NISAN_23,
          effect: "custom_hours",
          startTime: "10:00",
          endTime: "15:00",
        },
      ],
    };
    const result = resolveEffectiveSchedule(monday, customCtx);
    expect(result).toEqual({
      status: "open",
      startTime: "10:00",
      endTime: "15:00",
      source: "holiday_policy",
    });
  });

  it("returns weekly hours when policy effect is open_normal", () => {
    const openCtx: ScheduleResolutionContext = {
      ...ctx,
      holidayPolicies: [{ holidayTypeName: NISAN_23, effect: "open_normal" }],
    };
    const result = resolveEffectiveSchedule(monday, openCtx);
    expect(result).toEqual({
      status: "open",
      startTime: "09:00",
      endTime: "22:00",
      source: "holiday_policy",
    });
  });

  it("ignores holiday policy when date is outside calendar entry range", () => {
    const result = resolveEffectiveSchedule(tuesday, ctx);
    expect(result.source).toBe("weekly");
  });

  it("ignores holiday policy when no matching policy exists for the holiday", () => {
    const noPolicyCtx: ScheduleResolutionContext = {
      ...baseContext,
      calendarEntries: ctx.calendarEntries,
      holidayPolicies: [],
    };
    const result = resolveEffectiveSchedule(monday, noPolicyCtx);
    expect(result.source).toBe("weekly");
  });

  it("multi-day calendar entry covers all dates in range", () => {
    const ramadan: ScheduleResolutionContext = {
      ...baseContext,
      calendarEntries: [
        {
          holidayTypeName: "Ramadan",
          startDate: new Date(Date.UTC(2026, 2, 1)),
          endDate: new Date(Date.UTC(2026, 2, 29)),
        },
      ],
      holidayPolicies: [{ holidayTypeName: "Ramadan", effect: "closed" }],
    };
    const mid = new Date(Date.UTC(2026, 2, 15));
    expect(resolveEffectiveSchedule(mid, ramadan)).toEqual({
      status: "closed",
      source: "holiday_policy",
    });
    const outside = new Date(Date.UTC(2026, 2, 30));
    expect(resolveEffectiveSchedule(outside, ramadan).source).toBe("weekly");
  });
});

// ─── Working day override (priority 1) ───────────────────────────────────────

describe("resolveEffectiveSchedule — working day override", () => {
  const overrideCtx: ScheduleResolutionContext = {
    ...baseContext,
    calendarEntries: [
      { holidayTypeName: NISAN_23, startDate: monday, endDate: monday },
    ],
    holidayPolicies: [{ holidayTypeName: NISAN_23, effect: "closed" }],
    workingDayOverrides: [{ date: monday, effect: "open_normal" }],
  };

  it("override beats holiday policy — open_normal uses weekly hours", () => {
    const result = resolveEffectiveSchedule(monday, overrideCtx);
    expect(result).toEqual({
      status: "open",
      startTime: "09:00",
      endTime: "22:00",
      source: "override",
    });
  });

  it("override closed beats holiday policy that would allow open", () => {
    const ctx: ScheduleResolutionContext = {
      ...baseContext,
      calendarEntries: [
        { holidayTypeName: "TestHoliday", startDate: monday, endDate: monday },
      ],
      holidayPolicies: [
        { holidayTypeName: "TestHoliday", effect: "open_normal" },
      ],
      workingDayOverrides: [{ date: monday, effect: "closed" }],
    };
    expect(resolveEffectiveSchedule(monday, ctx)).toEqual({
      status: "closed",
      source: "override",
    });
  });

  it("override custom_hours beats everything", () => {
    const ctx: ScheduleResolutionContext = {
      ...overrideCtx,
      workingDayOverrides: [
        {
          date: monday,
          effect: "custom_hours",
          startTime: "11:00",
          endTime: "14:00",
        },
      ],
    };
    expect(resolveEffectiveSchedule(monday, ctx)).toEqual({
      status: "open",
      startTime: "11:00",
      endTime: "14:00",
      source: "override",
    });
  });

  it("override only applies to its exact date", () => {
    expect(resolveEffectiveSchedule(tuesday, overrideCtx).source).toBe(
      "weekly",
    );
  });
});

// ─── previewSchedule ──────────────────────────────────────────────────────────

describe("previewSchedule", () => {
  it("returns one entry per day inclusive", () => {
    const from = new Date(Date.UTC(2026, 3, 20));
    const to = new Date(Date.UTC(2026, 3, 24)); // 5 days
    expect(previewSchedule(from, to, baseContext)).toHaveLength(5);
  });

  it("returns exactly one entry when from === to", () => {
    const result = previewSchedule(monday, monday, baseContext);
    expect(result).toHaveLength(1);
    expect(result[0]!.date).toEqual(monday);
  });

  it("dates in result are consecutive calendar days", () => {
    const from = new Date(Date.UTC(2026, 3, 20));
    const to = new Date(Date.UTC(2026, 3, 24));
    const result = previewSchedule(from, to, baseContext);
    for (let i = 1; i < result.length; i++) {
      const diff =
        (result[i]!.date.getTime() - result[i - 1]!.date.getTime()) / 86400000;
      expect(diff).toBe(1);
    }
  });

  it("returns empty array when from > to", () => {
    expect(previewSchedule(tuesday, monday, baseContext)).toHaveLength(0);
  });

  it("each entry has a date and schedule", () => {
    const result = previewSchedule(monday, tuesday, baseContext);
    for (const entry of result) {
      expect(entry).toHaveProperty("date");
      expect(entry).toHaveProperty("schedule");
      expect(["open", "closed"]).toContain(entry.schedule.status);
    }
  });
});
