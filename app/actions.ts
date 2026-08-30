'use server';

import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/queries';
import {
  sendEmail,
  brandInfo,
  unsubscribeUrl,
  emailEnabled,
} from '@/lib/email/send';
import {
  bookingReceivedEmail,
  bookingNotifyEmail,
  bookingCancelledEmail,
  welcomeEmail,
} from '@/lib/email/templates';
import type { Booking } from '@/lib/types';
import { logActivity, alertLine } from '@/lib/log';
import { DEFAULT_DAILY_LIMIT } from '@/lib/constants';
import {
  bookingLineMessage,
  cancellationLineMessage,
  newReviewLineMessage,
} from '@/lib/line';
import {
  validateBooking,
  validateSubscribe,
  validateReview,
  looksAutomated,
  todayAtTheDiner,
  UUID_RE,
} from '@/lib/validation';
import { checkRateLimit, tooManyMessage } from '@/lib/rate-limit';

export type ActionResult = { ok: boolean; error?: string };

function supabaseReady() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Friendly date for emails: "Friday, 31 July 2026" */
function prettyDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Silently accepted, quietly discarded.
 *
 * A form-spam script that gets an error back tries something else; one
 * that gets a cheerful "thanks!" moves on. Only ever returned for input
 * that filled in the hidden honeypot field, which no guest can see.
 */
const PRETEND_SUCCESS: ActionResult = { ok: true };

/* ================================================================== */
/*  DAILY CAPACITY                                                     */
/* ================================================================== */

/**
 * How many tables are already booked on a date, and whether the day is full.
 * Uses the service-role client because visitors cannot read the bookings
 * table (by design — see the RLS policies in schema.sql).
 */
export async function checkCapacity(date: string): Promise<{
  limit: number;
  taken: number;
  full: boolean;
}> {
  const settings = await getSettings();
  const limit =
    Number(settings.max_bookings_per_day) > 0
      ? Number(settings.max_bookings_per_day)
      : DEFAULT_DAILY_LIMIT;

  const supabase = createAdminClient();
  if (!supabase) return { limit, taken: 0, full: false };

  // A date that has already passed can't be full — it's over. This also
  // stops junk left on an old date from holding it closed forever.
  if (date < todayAtTheDiner()) return { limit, taken: 0, full: false };

  try {
    const { count, error } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('booking_date', date)
      .neq('status', 'cancelled');

    if (error) return { limit, taken: 0, full: false };

    const taken = count ?? 0;
    return { limit, taken, full: taken >= limit };
  } catch {
    return { limit, taken: 0, full: false };
  }
}

/* ================================================================== */
/*  TABLE BOOKING                                                      */
/* ================================================================== */

export async function submitBooking(formData: FormData): Promise<ActionResult> {
  if (looksAutomated(formData)) return PRETEND_SUCCESS;

  const rate = await checkRateLimit('booking');
  if (!rate.allowed) {
    return { ok: false, error: tooManyMessage(rate.retryAfterMinutes) };
  }

  const checked = validateBooking(formData);
  if (!checked.ok) return { ok: false, error: checked.error };

  const { name, phone, email, booking_date, booking_time, guests, notes } =
    checked.value;

  if (!supabaseReady()) {
    console.log('[booking] Supabase not configured, logging instead:', {
      name,
      phone,
      email,
      booking_date,
      booking_time,
      guests,
    });
    return { ok: true };
  }

  // Is that day already full?
  const capacity = await checkCapacity(booking_date);
  if (capacity.full) {
    return {
      ok: false,
      error: `Sorry, we're fully booked on that date. Please pick another day, or call us and we'll do our best to squeeze you in.`,
    };
  }

  // Generated here rather than read back from the database: the public role
  // can INSERT into bookings but deliberately cannot SELECT from it, so a
  // .select() after .insert() would be rejected by row level security.
  let cancelToken: string | null = crypto.randomUUID();

  try {
    // Prefer the service-role client: it sidesteps RLS entirely, so a missing
    // or mis-configured policy can never stop a guest from booking. Falls back
    // to the public client if the service key isn't set.
    const admin = createAdminClient();
    const supabase = admin ?? (await createClient());

    const row: Record<string, unknown> = {
      name,
      phone,
      email: email || null,
      booking_date,
      booking_time,
      guests,
      notes,
      cancel_token: cancelToken,
    };

    // Columns added by later migrations. If the database hasn't been migrated
    // yet, drop the offending column and try again rather than losing the
    // booking — Postgres 42703 means "column does not exist".
    const OPTIONAL = ['cancel_token', 'email', 'notes'];

    let error = (await supabase.from('bookings').insert(row)).error;
    let guard = 0;

    while (error?.code === '42703' && guard++ < OPTIONAL.length) {
      const missing = OPTIONAL.find(
        (col) => row[col] !== undefined && error!.message.includes(col)
      );
      if (!missing) break;

      console.warn(
        `[booking] the "${missing}" column is missing — run the Supabase migrations. ` +
          `Saving the booking without it.`
      );
      delete row[missing];
      if (missing === 'cancel_token') cancelToken = null;

      error = (await supabase.from('bookings').insert(row)).error;
    }

    if (error) {
      console.error(
        '[booking] insert failed —',
        'code:', error.code,
        '| message:', error.message,
        '| details:', error.details,
        '| hint:', error.hint
      );

      await logActivity('email.failed', `A booking could not be saved: ${error.message}`, {
        level: 'error',
        meta: { code: error.code, details: error.details },
      });

      return {
        ok: false,
        error:
          error.code === '42P01'
            ? 'Our booking system is not set up yet. Please call us instead.'
            : 'Sorry, something went wrong. Please call us instead.',
      };
    }
  } catch (e) {
    console.error('[booking] unexpected error:', e);
    return {
      ok: false,
      error: 'Sorry, something went wrong. Please call us instead.',
    };
  }

  await logActivity(
    'booking.created',
    `${name} requested a table for ${guests} on ${prettyDate(booking_date)}`,
    { level: 'success', meta: { guests, date: booking_date, time: booking_time, hasEmail: Boolean(email) } }
  );

  // Everything below is telling people, not booking. The table is saved and
  // the guest's answer no longer depends on any of it, so after() hands the
  // browser its response first and runs this once the reply is on its way —
  // nobody waits on LINE and two emails to be told what already happened.
  // The function stays alive for it; this is not fire-and-forget.
  after(async () => {
    // LINE first: it is the channel the diner actually watches, and it lands
    // in under a second. alertLine swallows and records its own failures —
    // the table is already booked either way.
    await alertLine(
      bookingLineMessage({
        name,
        date: prettyDate(booking_date),
        time: booking_time,
        guests,
        phone,
        email,
        notes,
      })
    );

    try {
      const settings = await getSettings();
      const brand = brandInfo(settings);
      const details = {
        name,
        date: prettyDate(booking_date),
        time: booking_time,
        guests,
        phone,
      };

      if (email) {
        const mail = bookingReceivedEmail(
          details,
          brand,
          cancelToken ? `${brand.siteUrl}/cancel?token=${cancelToken}` : undefined
        );
        const res = await sendEmail({
          to: email,
          subject: mail.subject,
          html: mail.html,
        });
        if (!res.ok) {
          await logActivity(
            'email.failed',
            `Could not email the booking confirmation to ${email}`,
            { level: 'error', meta: { kind: 'booking_received', error: res.error } }
          );
        }
      }

      const notifyTo = process.env.ADMIN_NOTIFY_EMAIL || settings.email;
      if (notifyTo) {
        const mail = bookingNotifyEmail({ ...details, email, notes }, brand);
        await sendEmail({
          to: notifyTo,
          subject: mail.subject,
          html: mail.html,
          replyTo: email || undefined,
        });
      } else {
        // Worth shouting about: the table is saved but nobody has been told.
        console.warn(
          '[booking] no ADMIN_NOTIFY_EMAIL and no email in Settings — ' +
            'this booking notified nobody.'
        );
        await logActivity(
          'email.failed',
          'A booking was saved but there is no address to alert. Set ADMIN_NOTIFY_EMAIL.',
          { level: 'warning', meta: { stage: 'booking_notify' } }
        );
      }
    } catch (e) {
      console.error('[booking] email step failed (booking was still saved):', e);
      await logActivity('email.failed', 'Booking emails failed to send', {
        level: 'error',
        meta: { stage: 'booking', error: String(e) },
      });
    }
  });

  return { ok: true };
}

/* ================================================================== */
/*  GUEST CANCELS THEIR OWN BOOKING                                    */
/*  (via the private link in their confirmation email)                 */
/* ================================================================== */

export async function cancelBookingByToken(
  token: string
): Promise<ActionResult> {
  if (!token) return { ok: false, error: 'This link is missing its code.' };

  // A non-UUID can't match a row, and querying with one raises a Postgres
  // type error instead of returning nothing.
  if (!UUID_RE.test(token)) {
    return { ok: false, error: 'This cancellation link is not valid.' };
  }

  // A wrong token is a guess. Guessing is cheap for them and a service-role
  // query for us, so it gets counted like anything else public.
  const rate = await checkRateLimit('cancel');
  if (!rate.allowed) {
    return { ok: false, error: tooManyMessage(rate.retryAfterMinutes) };
  }

  // Guests are not logged in, and RLS has no public update policy on
  // bookings — so this needs the service-role client.
  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false, error: 'Cancellations are not set up. Please call us.' };
  }

  try {
    const { data: found } = await supabase
      .from('bookings')
      .select('*')
      .eq('cancel_token', token)
      .maybeSingle();

    const booking = found as Booking | null;
    if (!booking) return { ok: false, error: 'We could not find that booking.' };
    if (booking.status === 'cancelled') return { ok: true };

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('cancel_token', token);

    if (error) {
      console.error('[cancel] update failed:', error.message);
      return { ok: false, error: 'Could not cancel. Please call us instead.' };
    }

    await logActivity(
      'booking.cancelled',
      `${booking.name} cancelled their own booking for ${prettyDate(booking.booking_date)}`,
      { level: 'warning', meta: { by: 'guest' } }
    );

    // Let the restaurant know the table is free — LINE first, same as above,
    // and after the response for the same reason: the guest clicked a link in
    // an email and wants to see "cancelled", not a spinner.
    after(async () => {
      await alertLine(
        cancellationLineMessage(
          {
            name: booking.name,
            date: prettyDate(booking.booking_date),
            time: booking.booking_time,
            guests: booking.guests,
            phone: booking.phone,
          },
          'guest'
        )
      );

      try {
        const settings = await getSettings();
        const notifyTo = process.env.ADMIN_NOTIFY_EMAIL || settings.email;
        if (notifyTo) {
          const mail = bookingCancelledEmail(
            {
              name: booking.name,
              date: prettyDate(booking.booking_date),
              time: booking.booking_time,
              guests: booking.guests,
              phone: booking.phone,
            },
            brandInfo(settings)
          );
          await sendEmail({ to: notifyTo, subject: mail.subject, html: mail.html });
        }
      } catch (e) {
        console.error('[cancel] notify email failed:', e);
      }
    });

    return { ok: true };
  } catch (e) {
    console.error('[cancel] unexpected error:', e);
    return { ok: false, error: 'Could not cancel. Please call us instead.' };
  }
}

/* ================================================================== */
/*  NEWSLETTER SIGNUP                                                  */
/* ================================================================== */

export async function subscribe(formData: FormData): Promise<ActionResult> {
  if (looksAutomated(formData)) return PRETEND_SUCCESS;

  // This one sends a welcome email to whatever address is typed in, which
  // makes an unlimited version of it a way to mail someone who never asked.
  const rate = await checkRateLimit('subscribe');
  if (!rate.allowed) {
    return { ok: false, error: tooManyMessage(rate.retryAfterMinutes) };
  }

  const checked = validateSubscribe(formData);
  if (!checked.ok) return { ok: false, error: checked.error };

  const { email, name } = checked.value;

  if (!supabaseReady()) {
    console.log('[subscribe] Supabase not configured, logging instead:', email);
    return { ok: true };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subscribers')
      .insert({ email, name, source: 'website' })
      .select('unsubscribe_token')
      .single();

    if (error) {
      // 23505 = unique violation: they're already on the list. Not an error
      // worth showing — just say thanks.
      if (error.code === '23505') return { ok: true };
      console.error('[subscribe] insert failed:', error.message);
      return { ok: false, error: 'Sorry, that did not work. Please try again.' };
    }

    await logActivity('subscriber.joined', `${email} joined the mailing list`, {
      level: 'success',
      meta: { source: 'website' },
    });

    if (emailEnabled() && data?.unsubscribe_token) {
      const settings = await getSettings();
      const mail = welcomeEmail(
        name,
        brandInfo(settings),
        unsubscribeUrl(data.unsubscribe_token)
      );
      await sendEmail({ to: email, subject: mail.subject, html: mail.html });
    }

    return { ok: true };
  } catch (e) {
    console.error('[subscribe] unexpected error:', e);
    return { ok: false, error: 'Sorry, that did not work. Please try again.' };
  }
}

/* ================================================================== */
/*  GUEST REVIEW                                                       */
/* ================================================================== */

/**
 * A guest writes a review on the website. It goes into the queue as
 * `pending` and is not on the site until somebody approves it in
 * Admin → Reviews.
 *
 * Three separate things keep it that way, because this is the one public
 * form whose content is meant to be published:
 *
 *   - the status is set here, from the server, and never read from the form
 *   - the row-level security policy in schema.sql only permits an insert
 *     that is pending, from a guest, so the anon key cannot do better even
 *     if it is used directly against the REST API
 *   - a database missing those columns is refused outright, below
 */
export async function submitReview(formData: FormData): Promise<ActionResult> {
  if (looksAutomated(formData)) return PRETEND_SUCCESS;

  const rate = await checkRateLimit('review');
  if (!rate.allowed) {
    return { ok: false, error: tooManyMessage(rate.retryAfterMinutes) };
  }

  const checked = validateReview(formData);
  if (!checked.ok) return { ok: false, error: checked.error };

  const { author, quote, rating } = checked.value;

  if (!supabaseReady()) {
    console.log('[review] Supabase not configured, logging instead:', {
      author,
      rating,
    });
    return { ok: true };
  }

  try {
    // Service-role first, as everywhere else public: a mis-configured policy
    // then cannot stop a guest leaving a review. The anon client is the
    // fallback, and the insert policy in schema.sql covers it.
    const admin = createAdminClient();
    const supabase = admin ?? (await createClient());

    const { error } = await supabase.from('reviews').insert({
      author,
      quote,
      rating,
      source: 'guest',
      status: 'pending',
      is_active: true,
      sort_order: 0,
      reviewed_at: new Date().toISOString(),
    });

    if (error) {
      /**
       * 42703 = one of these columns does not exist, so the guest-review
       * migration has not been run.
       *
       * The other public forms drop the missing column and save anyway.
       * This one must not: without `status` the row takes the table default
       * of 'approved' and unmoderated writing goes straight onto the front
       * page. Refusing is the safe failure here.
       */
      if (error.code === '42703') {
        console.error(
          '[review] the reviews table is missing status/source — run ' +
            'supabase/schema.sql. Refusing the review rather than publishing ' +
            'it unapproved.'
        );
      } else {
        console.error('[review] insert failed —', error.code, error.message);
      }

      await logActivity(
        'email.failed',
        `A guest review could not be saved: ${error.message}`,
        { level: 'error', meta: { code: error.code, stage: 'review' } }
      );

      return {
        ok: false,
        error: 'Sorry, we could not save that just now. Please try again later.',
      };
    }
  } catch (e) {
    console.error('[review] unexpected error:', e);
    return {
      ok: false,
      error: 'Sorry, we could not save that just now. Please try again later.',
    };
  }

  await logActivity(
    'review.submitted',
    `${author} left a ${rating}-star review — waiting for approval`,
    { meta: { rating, source: 'website' } }
  );

  // The guest is done; telling the diner is not their wait. Same reasoning
  // as the booking form above.
  after(async () => {
    await alertLine(newReviewLineMessage({ author, rating, quote }));
  });

  return { ok: true };
}

/* ================================================================== */
/*  UNSUBSCRIBE  (one click, from the link in every promotion email)   */
/* ================================================================== */

export async function unsubscribeByToken(token: string): Promise<ActionResult> {
  if (!token) return { ok: false, error: 'Missing unsubscribe link.' };

  // The preview link inside the campaign editor points here with a dummy
  // token so staff can see where the footer link goes. Nothing to do.
  if (token === 'preview') {
    return { ok: false, error: 'This is a preview of the unsubscribe link.' };
  }

  if (!UUID_RE.test(token)) {
    // A mangled or truncated link — asking the database would just raise
    // "invalid input syntax for type uuid" and log a scary error.
    return { ok: false, error: 'This unsubscribe link is not valid.' };
  }

  if (!supabaseReady()) return { ok: true };

  // RLS has no public UPDATE policy on subscribers, so this needs the
  // service-role client.
  const supabase = createAdminClient();
  if (!supabase) {
    console.error('[unsubscribe] SUPABASE_SERVICE_ROLE_KEY is not set');
    return { ok: false, error: 'Unsubscribe is not configured yet.' };
  }

  try {
    const { error } = await supabase
      .from('subscribers')
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
      .eq('unsubscribe_token', token);

    if (error) {
      console.error('[unsubscribe] failed:', error.message);
      return { ok: false, error: 'Could not update your preferences.' };
    }

    await logActivity(
      'subscriber.unsubscribed',
      'Someone unsubscribed from the mailing list',
      { level: 'warning' }
    );
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not update your preferences.' };
  }
}
