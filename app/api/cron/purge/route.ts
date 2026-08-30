import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/log';

export const dynamic = 'force-dynamic';

/**
 * Nightly housekeeping.
 *
 *   GET /api/cron/purge
 *
 * Runs the purge_old_data() function from schema.sql, which:
 *
 *   - deletes bookings older than the retention window (name, phone, email
 *     and free-text notes about a meal a year ago are not something to keep
 *     indefinitely, and under Thailand's PDPA they are a liability)
 *   - forgets people who unsubscribed over a year ago — keeping an address
 *     after someone asked to be removed is the thing they objected to
 *   - clears spent rate-limit windows
 *   - trims the activity log, which used to be trimmed by a trigger on
 *     every single insert
 *   - releases any promotion left stuck mid-send by a deploy or a timeout
 *
 * Scheduled by vercel.json. Vercel signs its own cron calls with
 * CRON_SECRET when that variable is set; anyone else gets a 401.
 */

/** How long a booking is kept after its date. */
const RETENTION_MONTHS = 12;

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  // Without a secret configured, only allow it in development. A purge
  // endpoint that anyone can call is not as bad as it sounds — it deletes
  // by age, not on demand — but it is still not something to leave open.
  if (!secret) return process.env.NODE_ENV !== 'production';

  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not set' },
      { status: 503 }
    );
  }

  const { data, error } = await supabase.rpc('purge_old_data', {
    p_booking_months: RETENTION_MONTHS,
  });

  if (error) {
    const missing = error.code === '42883';
    console.error('[cron] purge failed:', error.message);
    return NextResponse.json(
      {
        error: missing
          ? 'purge_old_data() does not exist — run supabase/schema.sql'
          : error.message,
      },
      { status: missing ? 501 : 500 }
    );
  }

  const removed = (data ?? {}) as Record<string, number>;
  const touched = Object.values(removed).reduce((n, v) => n + (v || 0), 0);

  // Only worth a line in the activity feed when it actually did something.
  if (touched > 0) {
    await logActivity(
      'data.purged',
      `Housekeeping removed ${removed.bookings ?? 0} old booking${
        removed.bookings === 1 ? '' : 's'
      } and ${removed.subscribers ?? 0} lapsed subscriber${
        removed.subscribers === 1 ? '' : 's'
      }`,
      { meta: removed }
    );
  }

  return NextResponse.json(
    { ok: true, retentionMonths: RETENTION_MONTHS, removed },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
