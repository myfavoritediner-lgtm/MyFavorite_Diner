import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Rate limiting for the forms anyone on the internet can reach.
 *
 * Without this, one booking POST buys an attacker a database write, two
 * Resend emails and a LINE push — and with a daily limit of five tables,
 * five scripted bookings close a date to real guests.
 *
 * A fixed-window counter in Postgres, via the bump_rate_limit() function
 * in supabase/schema.sql. Postgres rather than memory because
 * serverless instances come and go and an in-memory counter resets with
 * them; Postgres rather than Redis because the database is already here.
 * If this ever needs to be sharper, Upstash or the Vercel WAF is the
 * upgrade — the call sites below don't change.
 *
 * Fails open. A rate limiter that goes down must not take the booking form
 * with it: losing a real table costs the diner more than letting a burst
 * through.
 */

export type Limit = { max: number; windowSeconds: number };

export const LIMITS = {
  /** Tables from one address. Generous for a family, useless for a script. */
  booking: { max: 5, windowSeconds: 60 * 60 },
  /** Mailing list signups — this one sends an email to whatever is typed. */
  subscribe: { max: 3, windowSeconds: 60 * 60 },
  /**
   * Guest reviews. Nothing they write reaches the website unapproved, so
   * the thing being limited is how much staff have to read: three from one
   * address in an hour is a family taking turns, thirty is a script.
   */
  review: { max: 3, windowSeconds: 60 * 60 },
  /** Cancellation attempts, which are token guesses when they fail. */
  cancel: { max: 20, windowSeconds: 60 * 60 },
} satisfies Record<string, Limit>;

/**
 * Who is asking. Vercel sets x-forwarded-for; the leftmost entry is the
 * client. Hashed before storage — a rate-limit table is not a reason to
 * keep a log of visitor IP addresses.
 */
async function clientKey(): Promise<string> {
  try {
    const h = await headers();
    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip')?.trim() ||
      'unknown';
    return createHash('sha256').update(ip).digest('hex').slice(0, 32);
  } catch {
    return 'unknown';
  }
}

export type RateResult = { allowed: boolean; retryAfterMinutes: number };

const ALLOW: RateResult = { allowed: true, retryAfterMinutes: 0 };

export async function checkRateLimit(
  bucket: keyof typeof LIMITS
): Promise<RateResult> {
  const supabase = createAdminClient();
  if (!supabase) return ALLOW; // no service key: nothing to count with

  const { max, windowSeconds } = LIMITS[bucket];

  try {
    const identifier = await clientKey();

    const { data, error } = await supabase.rpc('bump_rate_limit', {
      p_bucket: bucket,
      p_identifier: identifier,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      // 42883 = the function doesn't exist, i.e. the hardening migration
      // hasn't been run. Say so once, loudly, and let the request through.
      if (error.code === '42883' || error.code === '42P01') {
        console.warn(
          '[rate-limit] bump_rate_limit() is missing, so the public forms are ' +
            'unprotected. Run supabase/schema.sql.'
        );
      } else {
        console.warn('[rate-limit] check failed, allowing through:', error.message);
      }
      return ALLOW;
    }

    const count = typeof data === 'number' ? data : 0;
    if (count <= max) return ALLOW;

    return {
      allowed: false,
      retryAfterMinutes: Math.max(1, Math.ceil(windowSeconds / 60)),
    };
  } catch (e) {
    console.warn('[rate-limit] unexpected error, allowing through:', e);
    return ALLOW;
  }
}

/**
 * True the first time `identifier` is seen inside the window, false for
 * every repeat until it expires.
 *
 * Same Postgres counter as above, different buckets. Used to stop a broken
 * service filling the staff LINE group — and the month's 300-message
 * allowance — with the same alert over and over.
 *
 * Fails open, like everything else here: when the counter cannot be reached
 * an alert is sent. A duplicate card is a nuisance; a silent failure is the
 * thing this exists to prevent.
 */
export async function firstInWindow(
  bucket: string,
  identifier: string,
  windowSeconds: number
): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return true;

  try {
    const { data, error } = await supabase.rpc('bump_rate_limit', {
      p_bucket: bucket,
      p_identifier: identifier.slice(0, 64),
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return (typeof data === 'number' ? data : 1) <= 1;
  } catch {
    return true;
  }
}

/** The message a guest sees. Never mentions limits or scripts. */
export function tooManyMessage(minutes: number): string {
  return minutes >= 60
    ? 'That is a few more requests than we can take from one place in an hour. Please give it a little while, or call us and we will sort it out straight away.'
    : `Please wait about ${minutes} minutes and try again, or give us a call and we will sort it out straight away.`;
}
