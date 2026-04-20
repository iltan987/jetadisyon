export interface FixedHoliday {
  name: string;
  month: number;
  day: number;
}

export interface LunarHoliday {
  name: string;
  hijriMonth: number;
  hijriDayStart: number;
  hijriDayEnd: number;
}

export const FIXED_HOLIDAYS: FixedHoliday[] = [
  { name: "1 Ocak — Yılbaşı", month: 1, day: 1 },
  { name: "23 Nisan — Ulusal Egemenlik", month: 4, day: 23 },
  { name: "1 Mayıs — Emek ve Dayanışma", month: 5, day: 1 },
  { name: "19 Mayıs — Atatürk'ü Anma", month: 5, day: 19 },
  { name: "15 Temmuz — Demokrasi", month: 7, day: 15 },
  { name: "30 Ağustos — Zafer Bayramı", month: 8, day: 30 },
  { name: "29 Ekim — Cumhuriyet Bayramı", month: 10, day: 29 },
];

export const LUNAR_HOLIDAYS: LunarHoliday[] = [
  { name: "Üç Aylar", hijriMonth: 7, hijriDayStart: 1, hijriDayEnd: 1 },
  { name: "Mirac Kandili", hijriMonth: 7, hijriDayStart: 26, hijriDayEnd: 26 },
  { name: "Berat Kandili", hijriMonth: 8, hijriDayStart: 14, hijriDayEnd: 14 },
  { name: "Ramazan Ayı", hijriMonth: 9, hijriDayStart: 1, hijriDayEnd: 29 },
  { name: "Kadir Gecesi", hijriMonth: 9, hijriDayStart: 26, hijriDayEnd: 26 },
  { name: "Ramazan Bayramı", hijriMonth: 10, hijriDayStart: 1, hijriDayEnd: 3 },
  { name: "Kurban Arefesi", hijriMonth: 12, hijriDayStart: 9, hijriDayEnd: 9 },
  {
    name: "Kurban Bayramı",
    hijriMonth: 12,
    hijriDayStart: 10,
    hijriDayEnd: 13,
  },
  { name: "Hicri Yılbaşı", hijriMonth: 1, hijriDayStart: 1, hijriDayEnd: 1 },
  { name: "Aşure Günü", hijriMonth: 1, hijriDayStart: 10, hijriDayEnd: 10 },
  { name: "Mevlid Kandili", hijriMonth: 3, hijriDayStart: 11, hijriDayEnd: 11 },
];
