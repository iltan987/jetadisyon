import {
  gregorianToHijri,
  hijriToGregorian,
  islamicMonthDays,
} from "./hijri.js";
import {
  HOLIDAY_OVERRIDES,
  type HolidayDateOverride,
  toUTC,
} from "./holiday-overrides.js";
import { FIXED_HOLIDAYS, LUNAR_HOLIDAYS } from "./holiday-types.js";

export interface HolidayCalendarItem {
  holidayTypeName: string;
  startDate: Date;
  endDate: Date;
}

export interface IslamicHolidays {
  ucAylari: Date;
  mirac: Date;
  berat: Date;
  ramazanStart: Date;
  kadirGecesi: Date;
  ramazanEnd: Date;
  ramazanBayramiStart: Date;
  ramazanBayramiEnd: Date;
  kurbanArefesi: Date;
  kurbanBayramiStart: Date;
  kurbanBayramiEnd: Date;
  hicriYilbasi: Date;
  asure: Date;
  mevlid: Date;
}

function gregorianDate(g: { year: number; month: number; day: number }): Date {
  return new Date(Date.UTC(g.year, g.month - 1, g.day));
}

function hijriYearForGregorian(gregorianYear: number): number {
  const base = gregorianToHijri({ year: gregorianYear, month: 1, day: 1 }).year;
  for (const offset of [0, 1, -1]) {
    const candidate = base + offset;
    const ramazanStart = hijriToGregorian({
      year: candidate,
      month: 9,
      day: 1,
    });
    if (ramazanStart.year === gregorianYear) return candidate;
  }
  return base;
}

export function computeIslamicHolidays(gregorianYear: number): IslamicHolidays {
  const hijriYear = hijriYearForGregorian(gregorianYear);
  const nextHijriYear = hijriYear + 1;
  const ramazanDays = islamicMonthDays(hijriYear, 9);

  return {
    ucAylari: gregorianDate(
      hijriToGregorian({ year: hijriYear, month: 7, day: 1 }),
    ),
    mirac: gregorianDate(
      hijriToGregorian({ year: hijriYear, month: 7, day: 26 }),
    ),
    berat: gregorianDate(
      hijriToGregorian({ year: hijriYear, month: 8, day: 14 }),
    ),
    ramazanStart: gregorianDate(
      hijriToGregorian({ year: hijriYear, month: 9, day: 1 }),
    ),
    kadirGecesi: gregorianDate(
      hijriToGregorian({ year: hijriYear, month: 9, day: 26 }),
    ),
    ramazanEnd: gregorianDate(
      hijriToGregorian({ year: hijriYear, month: 9, day: ramazanDays }),
    ),
    ramazanBayramiStart: gregorianDate(
      hijriToGregorian({ year: hijriYear, month: 10, day: 1 }),
    ),
    ramazanBayramiEnd: gregorianDate(
      hijriToGregorian({ year: hijriYear, month: 10, day: 3 }),
    ),
    kurbanArefesi: gregorianDate(
      hijriToGregorian({ year: hijriYear, month: 12, day: 9 }),
    ),
    kurbanBayramiStart: gregorianDate(
      hijriToGregorian({ year: hijriYear, month: 12, day: 10 }),
    ),
    kurbanBayramiEnd: gregorianDate(
      hijriToGregorian({ year: hijriYear, month: 12, day: 13 }),
    ),
    hicriYilbasi: gregorianDate(
      hijriToGregorian({ year: nextHijriYear, month: 1, day: 1 }),
    ),
    asure: gregorianDate(
      hijriToGregorian({ year: nextHijriYear, month: 1, day: 10 }),
    ),
    mevlid: gregorianDate(
      hijriToGregorian({ year: nextHijriYear, month: 3, day: 11 }),
    ),
  };
}

function applyOverride(
  item: HolidayCalendarItem,
  override: HolidayDateOverride | undefined,
): HolidayCalendarItem {
  if (!override) return item;
  if ("from" in override) {
    return {
      ...item,
      startDate: toUTC(override.from),
      endDate: toUTC(override.to),
    };
  }
  const date = toUTC(override);
  return { ...item, startDate: date, endDate: date };
}

export function computeHolidayCalendar(year: number): HolidayCalendarItem[] {
  const items: HolidayCalendarItem[] = [];
  const yearOverrides = HOLIDAY_OVERRIDES[year] ?? {};

  for (const h of FIXED_HOLIDAYS) {
    items.push(
      applyOverride(
        {
          holidayTypeName: h.name,
          startDate: new Date(Date.UTC(year, h.month - 1, h.day)),
          endDate: new Date(Date.UTC(year, h.month - 1, h.day)),
        },
        yearOverrides[h.name],
      ),
    );
  }

  const islamic = computeIslamicHolidays(year);
  const lunarMap: Record<string, { start: Date; end: Date }> = {
    "Üç Aylar": { start: islamic.ucAylari, end: islamic.ucAylari },
    "Mirac Kandili": { start: islamic.mirac, end: islamic.mirac },
    "Berat Kandili": { start: islamic.berat, end: islamic.berat },
    "Ramazan Ayı": { start: islamic.ramazanStart, end: islamic.ramazanEnd },
    "Kadir Gecesi": { start: islamic.kadirGecesi, end: islamic.kadirGecesi },
    "Ramazan Bayramı": {
      start: islamic.ramazanBayramiStart,
      end: islamic.ramazanBayramiEnd,
    },
    "Kurban Arefesi": {
      start: islamic.kurbanArefesi,
      end: islamic.kurbanArefesi,
    },
    "Kurban Bayramı": {
      start: islamic.kurbanBayramiStart,
      end: islamic.kurbanBayramiEnd,
    },
    "Hicri Yılbaşı": { start: islamic.hicriYilbasi, end: islamic.hicriYilbasi },
    "Aşure Günü": { start: islamic.asure, end: islamic.asure },
    "Mevlid Kandili": { start: islamic.mevlid, end: islamic.mevlid },
  };

  for (const h of LUNAR_HOLIDAYS) {
    const dates = lunarMap[h.name];
    if (dates) {
      items.push(
        applyOverride(
          {
            holidayTypeName: h.name,
            startDate: dates.start,
            endDate: dates.end,
          },
          yearOverrides[h.name],
        ),
      );
    }
  }

  return items;
}
