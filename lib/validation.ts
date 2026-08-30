/**
 * What the server will accept from a stranger.
 *
 * These are plain functions with no server-only imports, so the same lists
 * drive the form in the browser and the check on the server — the two
 * cannot drift apart, and neither can be edited by the person filling the
 * form in.
 *
 * The rule throughout: a browser can send anything. The `required` and
 * `min` attributes on an input are a courtesy to the guest, not a control.
 */

/** Where the diner is. Booking dates are judged in the diner's own day. */
export const RESTAURANT_TZ = 'Asia/Bangkok';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cancel and unsubscribe tokens are UUIDs. Anything else was never ours. */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The sittings offered on the booking form. */
export const BOOKING_TIMES = [
  'Breakfast',
  'Lunch',
  'Afternoon',
  'Dinner',
  'Late',
] as const;

/** The party sizes offered on the booking form. */
export const BOOKING_GUESTS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7+ (big group)',
] as const;

/** How far ahead a table can be booked. */
export const MAX_DAYS_AHEAD = 365;

/** Settings the admin panel owns. Anything else in the form is ignored. */
export const SETTING_KEYS: string[] = [
  'phone',
  'email',
  'facebook_url',
  'address_line1',
  'address_line2',
  'hours',
  'maps_url',
  'max_bookings_per_day',
];

/**
 * The name of the hidden field both public forms carry. A real guest never
 * sees it and never fills it in; most form-spam scripts fill in everything
 * they find. Cheap, invisible, and it costs a legitimate visitor nothing.
 */
export const HONEYPOT_FIELD = 'company_website';

export function looksAutomated(formData: FormData): boolean {
  return String(formData.get(HONEYPOT_FIELD) ?? '').trim().length > 0;
}

/** Today's date in the diner's timezone, as YYYY-MM-DD. */
export function todayAtTheDiner(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape we compare against.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RESTAURANT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type Valid<T> = { ok: true; value: T };
export type Invalid = { ok: false; error: string };
export type Checked<T> = Valid<T> | Invalid;

const fail = (error: string): Invalid => ({ ok: false, error });

/* ------------------------------------------------------------------ */
/* booking                                                             */
/* ------------------------------------------------------------------ */

export type BookingInput = {
  name: string;
  phone: string;
  email: string;
  booking_date: string;
  booking_time: string;
  guests: string;
  notes: string | null;
};

export function validateBooking(
  formData: FormData,
  now: Date = new Date()
): Checked<BookingInput> {
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const booking_date = String(formData.get('date') ?? '').trim();
  const booking_time = String(formData.get('time') ?? '').trim();
  const guests = String(formData.get('guests') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  if (!name || !phone || !booking_date || !booking_time || !guests) {
    return fail('Please fill in all the required fields.');
  }

  if (name.length > 120) return fail('That name is too long.');
  if (phone.length > 40) return fail('That phone number is too long.');
  if (notes.length > 1000) {
    return fail('Please keep the notes under 1,000 characters.');
  }

  if (email) {
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return fail('That email address does not look right.');
    }
  }

  // A phone number should contain some digits. Catches junk without being
  // strict about the many ways people write a Thai or foreign number.
  if ((phone.match(/\d/g) ?? []).length < 6) {
    return fail('Please enter a phone number we can reach you on.');
  }

  if (!(BOOKING_TIMES as readonly string[]).includes(booking_time)) {
    return fail('Please choose one of the times offered.');
  }

  if (!(BOOKING_GUESTS as readonly string[]).includes(guests)) {
    return fail('Please choose how many people are coming.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking_date)) {
    return fail('Please choose a date.');
  }

  // Rejects 2026-02-31 and friends: the round trip changes the string.
  const parsed = new Date(booking_date + 'T00:00:00Z');
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== booking_date
  ) {
    return fail('That date does not exist.');
  }

  const today = todayAtTheDiner(now);
  if (booking_date < today) {
    return fail('That date has already passed. Please choose another day.');
  }
  if (booking_date > addDays(today, MAX_DAYS_AHEAD)) {
    return fail('That is too far ahead — please book within the next year.');
  }

  return {
    ok: true,
    value: {
      name,
      phone,
      email,
      booking_date,
      booking_time,
      guests,
      notes: notes || null,
    },
  };
}

/* ------------------------------------------------------------------ */
/* mailing list                                                        */
/* ------------------------------------------------------------------ */

export type SubscribeInput = { email: string; name: string | null };

export function validateSubscribe(formData: FormData): Checked<SubscribeInput> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const name = String(formData.get('name') ?? '').trim();

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return fail('Please enter a valid email address.');
  }
  if (name.length > 120) return fail('That name is too long.');

  return { ok: true, value: { email, name: name || null } };
}

/* ------------------------------------------------------------------ */
/* guest reviews                                                       */
/* ------------------------------------------------------------------ */

/** Shortest thing that is actually a review rather than a shrug. */
export const REVIEW_MIN = 10;
export const REVIEW_MAX = 1500;

/**
 * A link in a restaurant review is almost always someone advertising.
 *
 * Every review is moderated, so a link could never reach the website on
 * its own — but a queue full of casino spam is a job staff have to do, and
 * the point of the queue is that it stays short enough to read.
 */
const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|ru|xyz|top|shop|biz|info)\b)/i;

export type ReviewInput = { author: string; quote: string; rating: number };

export function validateReview(formData: FormData): Checked<ReviewInput> {
  const author = String(formData.get('author') ?? '').trim();
  const quote = String(formData.get('quote') ?? '').trim();
  const rating = Number(formData.get('rating') ?? 0);

  if (!author) return fail('Please tell us your name.');
  if (author.length > 80) return fail('That name is too long.');

  if (!quote) return fail('Please write a few words about your visit.');
  if (quote.length < REVIEW_MIN) {
    return fail('Please write a little more — a sentence is plenty.');
  }
  if (quote.length > REVIEW_MAX) {
    return fail(`Please keep it under ${REVIEW_MAX} characters.`);
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail('Please choose between one and five stars.');
  }

  if (LINK_RE.test(quote) || LINK_RE.test(author)) {
    return fail('Please leave your review without any web links in it.');
  }

  return { ok: true, value: { author, quote, rating } };
}
