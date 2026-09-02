import { describe, it, expect } from 'vitest';
import {
  validateBooking,
  validateSubscribe,
  validateReview,
  looksAutomated,
  todayAtTheDiner,
  HONEYPOT_FIELD,
  BOOKING_TIMES,
  BOOKING_GUESTS,
  REVIEW_MAX,
} from '@/lib/validation';

/**
 * The booking form is the one place on this site where a stranger's input
 * turns into a database row, two emails and a LINE push. These tests are
 * the net under that.
 */

/** A booking that should always be accepted, so each test can bend one part. */
function goodBooking(over: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    name: 'Somchai Prasert',
    phone: '081 234 5678',
    email: 'somchai@example.com',
    date: '2026-09-01',
    time: '7:00 PM',
    guests: '4',
    notes: 'Window table if you have one',
    ...over,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

/** Fixed "now" so these tests don't start failing in September. */
const NOW = new Date('2026-08-18T04:00:00Z'); // 11:00 in Bangkok

describe('the table times offered', () => {
  /**
   * These are generated from the opening hours rather than typed out, so
   * these tests are what stop a change to those three numbers quietly
   * offering tables at four in the morning.
   */
  it('runs from opening to an hour before closing, in half hours', () => {
    expect(BOOKING_TIMES[0]).toBe('9:00 AM');
    expect(BOOKING_TIMES[BOOKING_TIMES.length - 1]).toBe('11:00 PM');
    expect(BOOKING_TIMES).toHaveLength(29);
  });

  it('turns midday and midnight into the hours people say', () => {
    // 12-hour clocks have no 0 o'clock, and "12:00 PM" is noon, not midnight.
    expect(BOOKING_TIMES).toContain('12:00 PM');
    expect(BOOKING_TIMES).toContain('12:30 PM');
    expect(BOOKING_TIMES).not.toContain('0:00 PM');
    expect(BOOKING_TIMES).not.toContain('13:00 PM');
  });

  it('offers no time outside opening hours', () => {
    expect(BOOKING_TIMES).not.toContain('8:30 AM');
    expect(BOOKING_TIMES).not.toContain('11:30 PM');
    expect(BOOKING_TIMES).not.toContain('12:00 AM');
  });

  it('no longer offers the old sittings', () => {
    for (const old of ['Breakfast', 'Lunch', 'Afternoon', 'Dinner', 'Late']) {
      expect(BOOKING_TIMES).not.toContain(old);
    }
  });

  it('refuses a sitting name now that times are real', () => {
    // Bookings already in the database still read "Dinner" — that is display
    // text on an existing row. What must not happen is a new one arriving.
    const res = validateBooking(goodBooking({ time: 'Dinner' }), NOW);
    expect(res.ok).toBe(false);
  });
});

describe('validateBooking', () => {
  it('accepts a complete, sensible booking', () => {
    const res = validateBooking(goodBooking(), NOW);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.name).toBe('Somchai Prasert');
      expect(res.value.booking_date).toBe('2026-09-01');
      expect(res.value.notes).toBe('Window table if you have one');
    }
  });

  it('treats an empty notes field as no note at all', () => {
    const res = validateBooking(goodBooking({ notes: '   ' }), NOW);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.notes).toBeNull();
  });

  it('allows a booking with no email — the guest just gets no confirmation', () => {
    const res = validateBooking(goodBooking({ email: '' }), NOW);
    expect(res.ok).toBe(true);
  });

  for (const field of ['name', 'phone', 'date', 'time', 'guests']) {
    it(`rejects a booking with no ${field}`, () => {
      const res = validateBooking(goodBooking({ [field]: '' }), NOW);
      expect(res.ok).toBe(false);
    });
  }

  it('rejects a date that has already passed', () => {
    const res = validateBooking(goodBooking({ date: '2026-08-17' }), NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/already passed/i);
  });

  it("accepts today's date", () => {
    // The diner is in Bangkok. At 04:00 UTC it is already the 18th there,
    // and a guest booking lunch today must not be told the date has passed.
    const res = validateBooking(goodBooking({ date: '2026-08-18' }), NOW);
    expect(res.ok).toBe(true);
  });

  it('accepts a date that is only today in the diner\'s timezone', () => {
    // 18:00 UTC on the 18th is 01:00 on the 19th in Bangkok — so the 19th
    // is "today" for the restaurant even though UTC still says the 18th.
    const lateUtc = new Date('2026-08-18T18:00:00Z');
    const res = validateBooking(goodBooking({ date: '2026-08-19' }), lateUtc);
    expect(res.ok).toBe(true);
    expect(todayAtTheDiner(lateUtc)).toBe('2026-08-19');
  });

  it('rejects a date that does not exist', () => {
    const res = validateBooking(goodBooking({ date: '2026-02-31' }), NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/does not exist/i);
  });

  it('rejects a malformed date rather than handing it to Postgres', () => {
    const res = validateBooking(goodBooking({ date: 'tomorrow' }), NOW);
    expect(res.ok).toBe(false);
  });

  it('rejects a booking more than a year ahead', () => {
    const res = validateBooking(goodBooking({ date: '2030-01-01' }), NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/too far ahead/i);
  });

  it('only accepts the sittings the form offers', () => {
    for (const time of BOOKING_TIMES) {
      expect(validateBooking(goodBooking({ time }), NOW).ok).toBe(true);
    }
    expect(validateBooking(goodBooking({ time: 'Midnight' }), NOW).ok).toBe(false);
  });

  it('only accepts the party sizes the form offers', () => {
    for (const guests of BOOKING_GUESTS) {
      expect(validateBooking(goodBooking({ guests }), NOW).ok).toBe(true);
    }
    expect(validateBooking(goodBooking({ guests: '900' }), NOW).ok).toBe(false);
  });

  it('rejects an email that is not an email', () => {
    expect(validateBooking(goodBooking({ email: 'not-an-email' }), NOW).ok).toBe(
      false
    );
  });

  it('rejects a phone number with barely any digits in it', () => {
    expect(validateBooking(goodBooking({ phone: 'call me' }), NOW).ok).toBe(false);
  });

  it('accepts the many ways people write a phone number', () => {
    for (const phone of [
      '081 234 5678',
      '+66 81 234 5678',
      '(038) 123-456',
      '0812345678',
    ]) {
      expect(validateBooking(goodBooking({ phone }), NOW).ok).toBe(true);
    }
  });

  it('caps the fields that end up in an email and a LINE card', () => {
    expect(validateBooking(goodBooking({ name: 'a'.repeat(200) }), NOW).ok).toBe(
      false
    );
    expect(validateBooking(goodBooking({ notes: 'a'.repeat(2000) }), NOW).ok).toBe(
      false
    );
    expect(validateBooking(goodBooking({ phone: '1'.repeat(60) }), NOW).ok).toBe(
      false
    );
  });

  it('trims whitespace rather than storing it', () => {
    const res = validateBooking(goodBooking({ name: '  Anna  ' }), NOW);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.name).toBe('Anna');
  });
});

describe('validateSubscribe', () => {
  it('accepts an address and lowercases it', () => {
    const fd = new FormData();
    fd.set('email', '  Alex@Example.COM ');
    fd.set('name', 'Alex');
    const res = validateSubscribe(fd);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.email).toBe('alex@example.com');
      expect(res.value.name).toBe('Alex');
    }
  });

  it('treats a missing name as no name', () => {
    const fd = new FormData();
    fd.set('email', 'alex@example.com');
    const res = validateSubscribe(fd);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.name).toBeNull();
  });

  it('rejects junk', () => {
    for (const email of ['', 'alex', 'alex@', '@example.com', 'a b@c.com']) {
      const fd = new FormData();
      fd.set('email', email);
      expect(validateSubscribe(fd).ok).toBe(false);
    }
  });
});

/**
 * A review is the one public form whose content is meant to end up on the
 * website. It is moderated, so nothing here is the last line of defence —
 * but everything that gets past this lands in a queue a person has to read,
 * and a queue nobody can face is a queue that stops being read.
 */
describe('validateReview', () => {
  function goodReview(over: Record<string, string> = {}): FormData {
    const fd = new FormData();
    const base: Record<string, string> = {
      author: 'Somchai',
      quote: 'The bacon cheeseburger was the best I have had in Pattaya.',
      rating: '5',
      ...over,
    };
    Object.entries(base).forEach(([k, v]) => fd.set(k, v));
    return fd;
  }

  it('accepts an ordinary review', () => {
    const res = validateReview(goodReview());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.author).toBe('Somchai');
      expect(res.value.rating).toBe(5);
    }
  });

  it('trims the name and the review', () => {
    const res = validateReview(
      goodReview({ author: '  Anna  ', quote: '  Lovely pancakes, thank you.  ' })
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.author).toBe('Anna');
      expect(res.value.quote).toBe('Lovely pancakes, thank you.');
    }
  });

  it('needs a name', () => {
    expect(validateReview(goodReview({ author: '   ' })).ok).toBe(false);
  });

  it('needs more than a shrug', () => {
    expect(validateReview(goodReview({ quote: '' })).ok).toBe(false);
    expect(validateReview(goodReview({ quote: 'ok' })).ok).toBe(false);
    expect(validateReview(goodReview({ quote: 'Good food' })).ok).toBe(false);
  });

  it('caps the length of both fields', () => {
    expect(validateReview(goodReview({ author: 'a'.repeat(81) })).ok).toBe(false);
    expect(validateReview(goodReview({ quote: 'a'.repeat(REVIEW_MAX + 1) })).ok).toBe(
      false
    );
    expect(validateReview(goodReview({ quote: 'a'.repeat(REVIEW_MAX) })).ok).toBe(
      true
    );
  });

  it('only accepts one to five whole stars', () => {
    for (const rating of ['0', '6', '-1', '4.5', '', 'five']) {
      expect(validateReview(goodReview({ rating })).ok).toBe(false);
    }
    for (const rating of ['1', '2', '3', '4', '5']) {
      expect(validateReview(goodReview({ rating })).ok).toBe(true);
    }
  });

  it('turns away the link spam, which is what this form attracts', () => {
    const spam = [
      'Great diner https://buy-cheap-things.example and cheap too',
      'visit www.casino-example.net for a bonus',
      'best rates at cheappills.shop honestly',
    ];
    for (const quote of spam) {
      expect(validateReview(goodReview({ quote })).ok).toBe(false);
    }
    expect(validateReview(goodReview({ author: 'www.spam.xyz' })).ok).toBe(false);
  });

  it('does not mistake ordinary writing for a link', () => {
    const fine = [
      'Great food. Fast service. Will be back!',
      'We came at 8 a.m. and the pancakes were still warm.',
      'The staff were lovely...the coffee less so.',
    ];
    for (const quote of fine) {
      expect(validateReview(goodReview({ quote })).ok).toBe(true);
    }
  });
});

describe('honeypot', () => {
  it('ignores a form a real guest filled in', () => {
    expect(looksAutomated(goodBooking())).toBe(false);
  });

  it('catches a form where the hidden field was filled in', () => {
    const fd = goodBooking();
    fd.set(HONEYPOT_FIELD, 'https://buy-cheap-things.example');
    expect(looksAutomated(fd)).toBe(true);
  });
});
