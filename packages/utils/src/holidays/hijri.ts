import {
  gregorianToHijri as _g2h,
  hijriToGregorian as _h2g,
} from '@tabby_ai/hijri-converter';

interface GregorianDate {
  year: number;
  month: number;
  day: number;
}

interface HijriDate {
  year: number;
  month: number;
  day: number;
}

export function gregorianToHijri(date: GregorianDate): HijriDate {
  return _g2h(date);
}

export function hijriToGregorian(date: HijriDate): GregorianDate {
  return _h2g(date);
}

export function islamicMonthDays(hijriYear: number, hijriMonth: number): number {
  const firstDay = hijriToGregorian({ year: hijriYear, month: hijriMonth, day: 1 });
  let nextMonth = hijriMonth + 1;
  let nextYear = hijriYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const firstDayNextMonth = hijriToGregorian({
    year: nextYear,
    month: nextMonth,
    day: 1,
  });

  const msPerDay = 86400000;
  const firstMs = Date.UTC(firstDay.year, firstDay.month - 1, firstDay.day);
  const nextMs = Date.UTC(
    firstDayNextMonth.year,
    firstDayNextMonth.month - 1,
    firstDayNextMonth.day,
  );
  return Math.round((nextMs - firstMs) / msPerDay);
}
