import { gregorianToHijri, hijriToGregorian, islamicMonthDays } from './hijri.js';
import { FIXED_HOLIDAYS, LUNAR_HOLIDAYS } from './holiday-types.js';

export interface HolidayCalendarItem {
  holidayTypeName: string;
  startDate: Date;
  endDate: Date;
}

export interface IslamicHolidays {
  ramazanStart: Date;
  ramazanEnd: Date;
  ramazanBayramiStart: Date;
  ramazanBayramiEnd: Date;
  kurbanBayramiStart: Date;
  kurbanBayramiEnd: Date;
}

function gregorianDate(g: { year: number; month: number; day: number }): Date {
  return new Date(Date.UTC(g.year, g.month - 1, g.day));
}

export function computeIslamicHolidays(gregorianYear: number): IslamicHolidays {
  const hijri = gregorianToHijri({ year: gregorianYear, month: 7, day: 1 });
  const hijriYear = hijri.year;

  const ramazanDays = islamicMonthDays(hijriYear, 9);
  const ramazanStart = gregorianDate(
    hijriToGregorian({ year: hijriYear, month: 9, day: 1 }),
  );
  const ramazanEnd = gregorianDate(
    hijriToGregorian({ year: hijriYear, month: 9, day: ramazanDays }),
  );

  const ramazanBayramiStart = gregorianDate(
    hijriToGregorian({ year: hijriYear, month: 10, day: 1 }),
  );
  const ramazanBayramiEnd = gregorianDate(
    hijriToGregorian({ year: hijriYear, month: 10, day: 3 }),
  );

  const kurbanBayramiStart = gregorianDate(
    hijriToGregorian({ year: hijriYear, month: 12, day: 10 }),
  );
  const kurbanBayramiEnd = gregorianDate(
    hijriToGregorian({ year: hijriYear, month: 12, day: 13 }),
  );

  return {
    ramazanStart,
    ramazanEnd,
    ramazanBayramiStart,
    ramazanBayramiEnd,
    kurbanBayramiStart,
    kurbanBayramiEnd,
  };
}

export function computeHolidayCalendar(year: number): HolidayCalendarItem[] {
  const items: HolidayCalendarItem[] = [];

  for (const h of FIXED_HOLIDAYS) {
    items.push({
      holidayTypeName: h.name,
      startDate: new Date(Date.UTC(year, h.month - 1, h.day)),
      endDate: new Date(Date.UTC(year, h.month - 1, h.day)),
    });
  }

  const islamic = computeIslamicHolidays(year);
  const lunarMap: Record<string, { start: Date; end: Date }> = {
    'Ramazan Ayı': { start: islamic.ramazanStart, end: islamic.ramazanEnd },
    'Ramazan Bayramı': {
      start: islamic.ramazanBayramiStart,
      end: islamic.ramazanBayramiEnd,
    },
    'Kurban Bayramı': {
      start: islamic.kurbanBayramiStart,
      end: islamic.kurbanBayramiEnd,
    },
  };

  for (const h of LUNAR_HOLIDAYS) {
    const dates = lunarMap[h.name];
    if (dates) {
      items.push({
        holidayTypeName: h.name,
        startDate: dates.start,
        endDate: dates.end,
      });
    }
  }

  return items;
}
