import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  pushLine,
  lineEnabled,
  noticeLineMessage,
  type LineMessage,
} from '@/lib/line';
import { firstInWindow } from '@/lib/rate-limit';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export type ActivityEvent =
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.deleted'
  | 'subscriber.joined'
  | 'subscriber.unsubscribed'
  | 'subscriber.added_by_staff'
  | 'subscriber.deleted'
  | 'campaign.created'
  | 'campaign.sent'
  | 'campaign.test_sent'
  | 'campaign.deleted'
  | 'menu.updated'
  | 'menu.deleted'
  | 'menu.reordered'
  | 'menu.section_updated'
  | 'menu.section_deleted'
  | 'menu.imported'
  | 'gallery.updated'
  | 'gallery.deleted'
  | 'settings.updated'
  | 'review.submitted'
  | 'review.approved'
  | 'review.hidden'
  | 'review.deleted'
  | 'email.failed'
  | 'line.failed'
  | 'data.purged';

export type ActivityRow = {
  id: number;
  level: LogLevel;
  event: string;
  message: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

/* ================================================================== */
/*  LINE alerts                                                        */
/* ================================================================== */

/**
 * Sends a card to the staff LINE group.
 *
 * Every booking event that staff would want to know about goes through
 * here — a table requested, confirmed, cancelled or deleted — so there is
 * one place to look when asking "why did LINE not tell me about that".
 *
 * Never throws, and never lets a LINE problem reach the caller: the thing
 * being announced has already happened by the time this runs.
 */
export async function alertLine(card: LineMessage): Promise<void> {
  try {
    const res = await pushLine([card]);
    if (!res.ok) {
      console.error('[alerts] LINE alert failed —', res.error);
      // Recorded so a silent LINE shows up in Admin → Home rather than
      // only in a log nobody reads. logActivity never alerts on this
      // event, so it cannot start a loop.
      await logActivity('line.failed', 'A LINE alert could not be sent', {
        level: 'error',
        meta: { error: res.error, altText: card.altText },
      });
    }
  } catch (e) {
    console.error('[alerts] LINE alert threw:', e);
  }
}

/**
 * Alerting about the alerting is how you burn a month's quota in an
 * afternoon: a failed push logs line.failed, which would push again.
 */
const NEVER_ALERT: ReadonlySet<ActivityEvent> = new Set(['line.failed']);

/** One card per kind of problem per half hour. */
const QUIET_SECONDS = 30 * 60;

/**
 * Remembered inside this instance so a burst costs nothing. Fluid Compute
 * reuses instances, so in practice this catches most repeats before the
 * database is asked at all.
 */
const recentlyAlerted = new Map<string, number>();

function alreadyShouted(event: string): boolean {
  const now = Date.now();
  const window = QUIET_SECONDS * 1000;

  if (recentlyAlerted.size > 50) {
    for (const [k, t] of recentlyAlerted) {
      if (now - t > window) recentlyAlerted.delete(k);
    }
  }

  const last = recentlyAlerted.get(event);
  if (last && now - last < window) return true;

  recentlyAlerted.set(event, now);
  return false;
}

/**
 * Something broke. Tell LINE, but only once per problem per half hour.
 *
 * Without the throttle, a mail provider having a bad morning would send one
 * card per booking, and the free LINE plan allows 300 messages a month.
 */
async function alertProblem(
  event: ActivityEvent,
  message: string,
  meta?: Record<string, unknown>
): Promise<void> {
  if (NEVER_ALERT.has(event) || !lineEnabled()) return;
  if (alreadyShouted(event)) return;

  // Instance memory only covers this instance; the counter in Postgres is
  // what stops ten cold starts sending ten identical cards.
  if (!(await firstInWindow('line_alert', event, QUIET_SECONDS))) return;

  const detail = typeof meta?.error === 'string' ? meta.error : undefined;
  await alertLine(noticeLineMessage({ level: 'error', message, detail }));
}

/* ================================================================== */
/*  The log                                                            */
/* ================================================================== */

/**
 * Writes one line to the activity log.
 *
 * Fire-and-forget by design: logging must never break the thing it is
 * logging, so every failure is swallowed after a console warning.
 * Uses the service-role client because visitors (who trigger bookings
 * and signups) are not authenticated.
 *
 * Anything logged at `error` level is also pushed to LINE, throttled. That
 * is deliberate rather than per-call: it means a failure added anywhere in
 * the app later is announced without anybody having to remember to wire it
 * up. Pass `alert: false` for an error that genuinely does not need a phone
 * to buzz.
 */
export async function logActivity(
  event: ActivityEvent,
  message: string,
  opts: {
    level?: LogLevel;
    meta?: Record<string, unknown>;
    alert?: boolean;
  } = {}
): Promise<void> {
  const level = opts.level ?? 'info';
  const supabase = createAdminClient();

  if (supabase) {
    try {
      const { error } = await supabase.from('activity_log').insert({
        event,
        message,
        level,
        meta: opts.meta ?? null,
      });
      if (error && error.code !== '42P01') {
        // 42P01 = table doesn't exist yet (migration not run) — stay quiet.
        console.warn('[log] could not write activity:', error.message);
      }
    } catch {
      /* never throw from the logger */
    }
  }

  if (level === 'error' && opts.alert !== false) {
    await alertProblem(event, message, opts.meta);
  }
}
