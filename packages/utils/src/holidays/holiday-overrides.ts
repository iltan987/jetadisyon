export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type Day =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31;

export type CalDate = readonly [year: number, month: Month, day: Day];
export type HolidayDateOverride =
  | CalDate
  | { readonly from: CalDate; readonly to: CalDate };

export function d(year: number, month: Month, day: Day): CalDate {
  return [year, month, day];
}

export function toUTC([y, m, day]: CalDate): Date {
  if (y < 2000 || y > 2100) throw new Error(`Unexpected year: ${y}`);
  const date = new Date(Date.UTC(y, m - 1, day));
  if (date.getUTCMonth() !== m - 1) throw new Error(`Invalid date: ${y}-${m}-${day}`);
  return date;
}

export const HOLIDAY_OVERRIDES: Record<number, Record<string, HolidayDateOverride>> = {
  2024: {
    "Üç Aylar":      d(2024,  1, 12),
    "Mirac Kandili": d(2024,  2,  6),
  },
  2026: {
    "Ramazan Ayı":  { from: d(2026, 2, 19), to: d(2026, 3, 19) },
    "Kadir Gecesi": d(2026,  3, 16),
  },
};
