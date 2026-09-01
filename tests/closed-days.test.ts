import { describe, it, expect } from 'vitest';
import {
  addDays,
  closedDaysLabel,
  isClosedDay,
  nextOpenDay,
  parseClosedDays,
  validateBooking,
  weekdayOf,
  WEEKDAYS,
} from '@/lib/validation';

/**
 * The days the diner is shut.
 *
 * The booking calendar greys these out, but the calendar is the courtesy —
 * this is the control. A guest with a stale page open, or anything posting
 * straight at the action, still has to be turned away here.
 *
 * Dates used below, so the weekdays are not a guessing game:
 *   2026-09-01 Tue   2026-09-05 Sat
 *   2026-09-02 Wed   2026-09-06 Sun
 *   2026-09-07 Mon
 */

/** Fixed "now" so these tests don't start failing next month. */
const NOW = new Date('2026-08-18T04:00:00Z'); // 11:00 in Bangkok

function booking(over: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    name: 'Somchai Prasert',
    phone: '081 234 5678',
    email: 'somchai@example.com',
    date: '2026-09-01',
    time: 'Dinner',
    guests: '4',
    ...over,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

describe('parseClosedDays', () => {
  it('reads nothing as open all week', () => {
    expect(parseClosedDays('')).toEqual([]);
    expect(parseClosedDays(null)).toEqual([]);
    expect(parseClosedDays(undefined)).toEqual([]);
  });

  it('reads one day and several', () => {
    expect(parseClosedDays('1')).toEqual([1]);
    expect(parseClosedDays('1,3')).toEqual([1, 3]);
  });

  it('sorts, de-duplicates and forgives spaces', () => {
    expect(parseClosedDays(' 3 , 1 ,3 ')).toEqual([1, 3]);
  });

  it('drops anything that is not a weekday number', () => {
    expect(parseClosedDays('1,banana,9,-2,3.5,,2')).toEqual([1, 2]);
  });

  it('ignores a setting that closes every day', () => {
    // Seven closed days would leave the booking form with no date to offer.
    // Better to behave as though it were never set than to take bookings off
    // the site entirely.
    expect(parseClosedDays('0,1,2,3,4,5,6')).toEqual([]);
  });
});

describe('weekdayOf', () => {
  it('reads a plain date as a calendar date, not an instant', () => {
    expect(weekdayOf('2026-09-07')).toBe(1); // Monday
    expect(weekdayOf('2026-09-06')).toBe(0); // Sunday
    expect(WEEKDAYS[weekdayOf('2026-09-01')]).toBe('Tuesday');
  });
});

describe('isClosedDay', () => {
  it('matches on the weekday, not the date', () => {
    expect(isClosedDay('2026-09-07', [1])).toBe(true); // a Monday
    expect(isClosedDay('2026-09-01', [1])).toBe(false); // a Tuesday
  });

  it('is never closed when nothing is set', () => {
    expect(isClosedDay('2026-09-07', [])).toBe(false);
  });
});

describe('nextOpenDay', () => {
  it('leaves a day that is already open alone', () => {
    expect(nextOpenDay('2026-09-01', [1])).toBe('2026-09-01');
  });

  it('steps over a closed day', () => {
    // Monday the 7th, closed Mondays, so Tuesday the 8th.
    expect(nextOpenDay('2026-09-07', [1])).toBe('2026-09-08');
  });

  it('steps over a run of closed days', () => {
    // Closed Sunday and Monday: from Sunday the 6th to Tuesday the 8th.
    expect(nextOpenDay('2026-09-06', [0, 1])).toBe('2026-09-08');
  });

  it('crosses the end of a month', () => {
    expect(nextOpenDay('2026-08-31', [1])).toBe('2026-09-01'); // Mon -> Tue
  });
});

describe('addDays', () => {
  it('crosses months and years', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });

  it('gets February right in a leap year', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('closedDaysLabel', () => {
  it('says nothing when the diner is open all week', () => {
    expect(closedDaysLabel([])).toBe('');
  });

  it('writes one, two and three days the way a person would', () => {
    expect(closedDaysLabel([1])).toBe('Mondays');
    expect(closedDaysLabel([1, 2])).toBe('Mondays and Tuesdays');
    expect(closedDaysLabel([0, 1, 2])).toBe(
      'Sundays, Mondays and Tuesdays'
    );
  });
});

describe('validateBooking, against the closed days', () => {
  it('takes a booking on a day the diner is open', () => {
    // Tuesday the 1st, closed Mondays.
    expect(validateBooking(booking(), NOW, [1]).ok).toBe(true);
  });

  it('turns one away on a closed day, and names the day', () => {
    const res = validateBooking(booking({ date: '2026-09-07' }), NOW, [1]);
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toContain('Monday');
  });

  it('takes every day when no closed days are set', () => {
    for (const date of ['2026-09-05', '2026-09-06', '2026-09-07']) {
      expect(validateBooking(booking({ date }), NOW).ok).toBe(true);
    }
  });

  it('still puts the older checks first', () => {
    // A date in the past that also falls on a closed day should be turned
    // away for having passed — that is the more useful thing to be told.
    const res = validateBooking(booking({ date: '2026-08-17' }), NOW, [1]);
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toContain('passed');
  });
});
