export interface WeeklyScheduleDayInput {
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

export interface WorkingDayOverrideInput {
  date: Date;
  effect: 'closed' | 'custom_hours' | 'open_normal';
  startTime?: string;
  endTime?: string;
}

export interface HolidayPolicyInput {
  holidayTypeName: string;
  effect: 'closed' | 'custom_hours' | 'open_normal';
  startTime?: string;
  endTime?: string;
}

export interface CalendarEntryInput {
  holidayTypeName: string;
  startDate: Date;
  endDate: Date;
}

export interface ScheduleResolutionContext {
  weeklySchedule: WeeklyScheduleDayInput[];
  workingDayOverrides: WorkingDayOverrideInput[];
  holidayPolicies: HolidayPolicyInput[];
  calendarEntries: CalendarEntryInput[];
}

export type EffectiveSchedule =
  | { status: 'closed'; source: 'override' | 'holiday_policy' | 'weekly' }
  | {
      status: 'open';
      startTime: string;
      endTime: string;
      source: 'override' | 'holiday_policy' | 'weekly';
    };

type EffectSource = 'override' | 'holiday_policy' | 'weekly';
type Effect = 'closed' | 'custom_hours' | 'open_normal';

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function dateInRange(date: Date, start: Date, end: Date): boolean {
  const d = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const s = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const e = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return d >= s && d <= e;
}

function weeklyScheduleForDate(
  date: Date,
  weeklySchedule: WeeklyScheduleDayInput[],
): WeeklyScheduleDayInput | undefined {
  return weeklySchedule.find((w) => w.dayOfWeek === date.getUTCDay());
}

function scheduleFromEffect(
  effect: Effect,
  source: EffectSource,
  weeklySchedule: WeeklyScheduleDayInput[],
  date: Date,
  customStart?: string,
  customEnd?: string,
): EffectiveSchedule {
  if (effect === 'closed') {
    return { status: 'closed', source };
  }
  if (effect === 'open_normal') {
    const weekly = weeklyScheduleForDate(date, weeklySchedule);
    if (weekly?.isOpen) {
      return { status: 'open', startTime: weekly.startTime, endTime: weekly.endTime, source };
    }
    return { status: 'closed', source };
  }
  return {
    status: 'open',
    startTime: customStart ?? '00:00',
    endTime: customEnd ?? '23:59',
    source,
  };
}

function resolveFromOverride(
  date: Date,
  context: ScheduleResolutionContext,
): EffectiveSchedule | null {
  for (const override of context.workingDayOverrides) {
    if (isSameDate(date, override.date)) {
      return scheduleFromEffect(
        override.effect,
        'override',
        context.weeklySchedule,
        date,
        override.startTime,
        override.endTime,
      );
    }
  }
  return null;
}

function resolveFromHolidayPolicy(
  date: Date,
  context: ScheduleResolutionContext,
): EffectiveSchedule | null {
  for (const entry of context.calendarEntries) {
    if (!dateInRange(date, entry.startDate, entry.endDate)) continue;
    const policy = context.holidayPolicies.find(
      (p) => p.holidayTypeName === entry.holidayTypeName,
    );
    if (!policy) continue;
    return scheduleFromEffect(
      policy.effect,
      'holiday_policy',
      context.weeklySchedule,
      date,
      policy.startTime,
      policy.endTime,
    );
  }
  return null;
}

export function resolveEffectiveSchedule(
  date: Date,
  context: ScheduleResolutionContext,
): EffectiveSchedule {
  const fromOverride = resolveFromOverride(date, context);
  if (fromOverride) return fromOverride;

  const fromPolicy = resolveFromHolidayPolicy(date, context);
  if (fromPolicy) return fromPolicy;

  const weekly = weeklyScheduleForDate(date, context.weeklySchedule);
  if (!weekly?.isOpen) {
    return { status: 'closed', source: 'weekly' };
  }
  return {
    status: 'open',
    startTime: weekly.startTime,
    endTime: weekly.endTime,
    source: 'weekly',
  };
}

export function previewSchedule(
  from: Date,
  to: Date,
  context: ScheduleResolutionContext,
): Array<{ date: Date; schedule: EffectiveSchedule }> {
  const results: Array<{ date: Date; schedule: EffectiveSchedule }> = [];
  const current = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  const end = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
  );

  while (current <= end) {
    results.push({
      date: new Date(current),
      schedule: resolveEffectiveSchedule(current, context),
    });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return results;
}
