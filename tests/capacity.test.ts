import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Capacity decides whether a real guest is turned away, so it is worth a
 * net. Everything the action touches is mocked — a test that could reach
 * Supabase, Resend or LINE would be worse than no test at all.
 */

const settings = vi.hoisted(() => ({ value: {} as Record<string, string> }));
const countResult = vi.hoisted(() => ({
  count: 0 as number | null,
  error: null as { message: string } | null,
}));
const lastQuery = vi.hoisted(() => ({
  date: '',
  excludedStatus: '',
  called: false,
}));

vi.mock('@/lib/queries', () => ({
  getSettings: async () => settings.value,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from() {
      return {
        select() {
          return this;
        },
        eq(_col: string, value: string) {
          lastQuery.date = value;
          lastQuery.called = true;
          return this;
        },
        neq(_col: string, value: string) {
          lastQuery.excludedStatus = value;
          return Promise.resolve(countResult);
        },
      };
    },
  }),
}));

// Pulled in at module scope by app/actions.ts but not used by checkCapacity.
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));
vi.mock('@/lib/email/send', () => ({
  sendEmail: async () => ({ ok: true }),
  brandInfo: () => ({ siteUrl: 'https://x' }),
  unsubscribeUrl: () => 'https://x/u',
  emailEnabled: () => false,
}));
vi.mock('@/lib/line', () => ({
  pushLine: async () => ({ ok: true }),
  bookingLineMessage: () => ({}),
  cancellationLineMessage: () => ({}),
}));
vi.mock('@/lib/log', () => ({ logActivity: async () => {} }));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: async () => ({ allowed: true, retryAfterMinutes: 0 }),
  tooManyMessage: () => 'too many',
}));

const { checkCapacity } = await import('@/app/actions');
const { todayAtTheDiner, MAX_DAYS_AHEAD } = await import('@/lib/validation');
const { DEFAULT_DAILY_LIMIT } = await import('@/lib/constants');

/** A date far enough ahead to always be in the future. */
function future(days = 30): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => {
  settings.value = {};
  countResult.count = 0;
  countResult.error = null;
  lastQuery.date = '';
  lastQuery.excludedStatus = '';
  lastQuery.called = false;
});

describe('checkCapacity', () => {
  it('uses the built-in limit when the diner has not set one', async () => {
    const res = await checkCapacity(future());
    expect(res.limit).toBe(DEFAULT_DAILY_LIMIT);
  });

  it('uses the limit from Settings when there is one', async () => {
    settings.value = { max_bookings_per_day: '12' };
    const res = await checkCapacity(future());
    expect(res.limit).toBe(12);
  });

  it('ignores a nonsense limit rather than closing the diner', async () => {
    for (const bad of ['0', '-3', 'lots', '']) {
      settings.value = { max_bookings_per_day: bad };
      const res = await checkCapacity(future());
      expect(res.limit, bad).toBe(DEFAULT_DAILY_LIMIT);
    }
  });

  it('is not full below the limit', async () => {
    settings.value = { max_bookings_per_day: '5' };
    countResult.count = 4;
    const res = await checkCapacity(future());
    expect(res.taken).toBe(4);
    expect(res.full).toBe(false);
  });

  it('is full exactly at the limit, not one past it', async () => {
    settings.value = { max_bookings_per_day: '5' };
    countResult.count = 5;
    expect((await checkCapacity(future())).full).toBe(true);
  });

  it('stays full above the limit', async () => {
    settings.value = { max_bookings_per_day: '5' };
    countResult.count = 6;
    expect((await checkCapacity(future())).full).toBe(true);
  });

  it('does not count cancelled bookings against the day', async () => {
    await checkCapacity(future());
    expect(lastQuery.excludedStatus).toBe('cancelled');
  });

  it('asks about the date it was given', async () => {
    const date = future(10);
    await checkCapacity(date);
    expect(lastQuery.date).toBe(date);
  });

  it('never reports a past date as full, and does not even ask', async () => {
    // A day that has already happened cannot be booked out, and junk left
    // on an old date must not be able to hold it closed forever.
    countResult.count = 999;
    const res = await checkCapacity('2020-01-01');
    expect(res.full).toBe(false);
    expect(res.taken).toBe(0);
    expect(lastQuery.called).toBe(false);
  });

  it('treats today as bookable', async () => {
    settings.value = { max_bookings_per_day: '5' };
    countResult.count = 1;
    const res = await checkCapacity(todayAtTheDiner());
    expect(lastQuery.called).toBe(true);
    expect(res.taken).toBe(1);
  });

  it('lets the booking through if the count query fails', async () => {
    // Losing a real table costs the diner more than letting one extra
    // through, so a broken count fails open.
    countResult.error = { message: 'connection reset' };
    const res = await checkCapacity(future());
    expect(res.full).toBe(false);
  });

  it('treats a null count as none taken', async () => {
    countResult.count = null;
    const res = await checkCapacity(future());
    expect(res.taken).toBe(0);
    expect(res.full).toBe(false);
  });

  it('keeps the booking window sane', () => {
    expect(MAX_DAYS_AHEAD).toBeGreaterThan(30);
    expect(MAX_DAYS_AHEAD).toBeLessThanOrEqual(400);
  });
});
