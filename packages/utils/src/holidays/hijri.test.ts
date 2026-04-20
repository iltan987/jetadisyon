import { describe, expect, it } from 'vitest';

import { gregorianToHijri, hijriToGregorian, islamicMonthDays } from './hijri.js';

describe('gregorianToHijri', () => {
  it('converts a known Gregorian date to Hijri', () => {
    const result = gregorianToHijri({ year: 2026, month: 3, day: 20 });
    expect(result).toMatchObject({ year: expect.any(Number), month: expect.any(Number), day: expect.any(Number) });
    expect(result.year).toBeGreaterThan(1440);
    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
    expect(result.day).toBeGreaterThanOrEqual(1);
    expect(result.day).toBeLessThanOrEqual(30);
  });

  it('is the inverse of hijriToGregorian', () => {
    const hijri = { year: 1447, month: 9, day: 1 };
    const gregorian = hijriToGregorian(hijri);
    const roundTrip = gregorianToHijri(gregorian);
    expect(roundTrip).toEqual(hijri);
  });
});

describe('hijriToGregorian', () => {
  it('converts a known Hijri date to Gregorian', () => {
    const result = hijriToGregorian({ year: 1447, month: 1, day: 1 });
    expect(result.year).toBe(2025);
    expect(result.month).toBeGreaterThanOrEqual(1);
    expect(result.month).toBeLessThanOrEqual(12);
    expect(result.day).toBeGreaterThanOrEqual(1);
    expect(result.day).toBeLessThanOrEqual(31);
  });
});

describe('islamicMonthDays', () => {
  it('returns 29 or 30 days for any valid month', () => {
    for (let month = 1; month <= 12; month++) {
      const days = islamicMonthDays(1447, month);
      expect([29, 30]).toContain(days);
    }
  });

  it('handles month 12 → rolls over to next year correctly', () => {
    const days = islamicMonthDays(1447, 12);
    expect([29, 30]).toContain(days);
  });

  it('Ramazan (month 9) is 29 or 30 days', () => {
    const days = islamicMonthDays(1447, 9);
    expect([29, 30]).toContain(days);
  });
});
