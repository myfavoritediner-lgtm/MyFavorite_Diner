import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/queries';
import { lineEnabled, lineQuota } from '@/lib/line';

export type CheckStatus = 'ok' | 'warn' | 'down';

export type Check = {
  name: string;
  status: CheckStatus;
  detail: string;
  hint?: string;
};

/**
 * Live system checks shown on the monitor dashboard and returned by
 * /api/health. Everything is wrapped so a single failing check can
 * never take the page down.
 */
export async function runHealthChecks(): Promise<Check[]> {
  const checks: Check[] = [];

  /* ---------------- database ---------------- */
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasUrl || !hasAnon) {
    checks.push({
      name: 'Database',
      status: 'down',
      detail: 'Supabase keys are missing',
      hint: 'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local',
    });
  } else {
    const started = Date.now();
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from('menu_categories')
        .select('id', { count: 'exact', head: true });
      const ms = Date.now() - started;

      if (error) {
        checks.push({
          name: 'Database',
          status: 'down',
          detail: error.message,
          hint: 'Have you run supabase/schema.sql in the SQL editor?',
        });
      } else {
        checks.push({
          name: 'Database',
          status: ms > 1500 ? 'warn' : 'ok',
          detail: `Connected · responded in ${ms} ms`,
        });
      }
    } catch (e) {
      checks.push({
        name: 'Database',
        status: 'down',
        detail: 'Could not reach Supabase',
        hint: String(e),
      });
    }
  }

  /* ---------------- bookings table shape ---------------- */
  const adminForBookings = createAdminClient();
  if (adminForBookings) {
    try {
      const { error } = await adminForBookings
        .from('bookings')
        .select('id, name, phone, email, booking_date, booking_time, guests, notes, status, cancel_token')
        .limit(1);

      if (!error) {
        checks.push({
          name: 'Booking form',
          status: 'ok',
          detail: 'Ready to take bookings',
        });
      } else if (error.code === '42P01') {
        checks.push({
          name: 'Booking form',
          status: 'down',
          detail: 'The bookings table does not exist',
          hint: 'Run supabase/schema.sql in the Supabase SQL editor',
        });
      } else if (error.code === '42703') {
        const missing = ['email', 'cancel_token', 'cancelled_at', 'notes'].filter(
          (c) => error.message.includes(c)
        );

        checks.push({
          name: 'Booking form',
          status: 'down',
          detail: `The bookings table is missing: ${missing.join(', ') || 'a column'}`,
          hint: 'Run supabase/schema.sql in the Supabase SQL editor',
        });
      } else {
        checks.push({
          name: 'Booking form',
          status: 'down',
          detail: error.message,
          hint: `Postgres code ${error.code}`,
        });
      }
    } catch {
      checks.push({
        name: 'Booking form',
        status: 'warn',
        detail: 'Could not check the bookings table',
      });
    }
  }

  /* ---------------- service role key ---------------- */
  checks.push(
    process.env.SUPABASE_SERVICE_ROLE_KEY
      ? { name: 'Unsubscribe links', status: 'ok', detail: 'Service role key is set' }
      : {
          name: 'Unsubscribe links',
          status: 'warn',
          detail: 'SUPABASE_SERVICE_ROLE_KEY is missing',
          hint: 'One-click unsubscribe and the activity log will not work without it',
        }
  );

  /* ---------------- email ---------------- */
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM ?? '';

  if (!hasResend) {
    checks.push({
      name: 'Email (Resend)',
      status: 'down',
      detail: 'RESEND_API_KEY is missing',
      hint: 'No emails will be sent — they are logged to the console instead',
    });
  } else if (!from) {
    checks.push({
      name: 'Email (Resend)',
      status: 'down',
      detail: 'EMAIL_FROM is missing',
      hint: 'Resend needs a from address. Both the key AND the address are required.',
    });
  } else if (from.includes('resend.dev')) {
    checks.push({
      name: 'Email (Resend)',
      status: 'warn',
      detail: `Sending as ${from}`,
      hint: 'The resend.dev test address only delivers to your own Resend account email. Verify your domain to email real guests.',
    });
  } else {
    checks.push({
      name: 'Email (Resend)',
      status: 'ok',
      detail: `Sending as ${from}`,
    });
  }

  /* ---------------- booking notifications ---------------- */
  /**
   * Both sources count. submitBooking() uses ADMIN_NOTIFY_EMAIL and falls
   * back to Settings → email, so checking only the variable told anyone who
   * had filled in Settings that they had set nothing, and pointed them at
   * the field they had just used.
   *
   * The case worth shouting about is neither one set AND no LINE: a guest
   * books a table and not one person is told. That is not a warning, it is
   * the booking system not doing its job.
   */
  const settings = await getSettings();
  const notifyTo = process.env.ADMIN_NOTIFY_EMAIL?.trim() || settings.email?.trim();

  if (notifyTo) {
    checks.push({
      name: 'Booking alerts',
      status: 'ok',
      detail: `New bookings go to ${notifyTo}`,
    });
  } else if (lineEnabled()) {
    checks.push({
      name: 'Booking alerts',
      status: 'warn',
      detail: 'LINE only — no alert email',
      hint: 'Bookings reach LINE but nothing is emailed. Set ADMIN_NOTIFY_EMAIL, or fill in the email field in Settings, so there is a second copy.',
    });
  } else {
    checks.push({
      name: 'Booking alerts',
      status: 'down',
      detail: 'Nobody is told when a table is booked',
      hint: 'There is no alert email and no LINE. Bookings are saved and visible in Admin → Bookings, but nothing reaches you. Set ADMIN_NOTIFY_EMAIL or the email field in Settings, and finish the LINE setup.',
    });
  }

  /* ---------------- LINE alerts ---------------- */
  const lineToken = Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
  const lineTarget = (process.env.LINE_TARGET_ID ?? '').trim();

  if (!lineToken && !lineTarget) {
    checks.push({
      name: 'LINE alerts',
      status: 'warn',
      detail: 'Not set up',
      hint: 'Optional. Set LINE_CHANNEL_ACCESS_TOKEN and LINE_TARGET_ID to get a LINE message the moment a table is booked.',
    });
  } else if (!lineToken) {
    checks.push({
      name: 'LINE alerts',
      status: 'down',
      detail: 'LINE_CHANNEL_ACCESS_TOKEN is missing',
      hint: 'LINE Developers Console → your channel → Messaging API → issue a long-lived access token',
    });
  } else if (!lineTarget) {
    checks.push({
      name: 'LINE alerts',
      status: 'down',
      detail: 'LINE_TARGET_ID is missing — nothing has anywhere to go',
      hint: 'Add the bot to your staff group and send "id"; it replies with the value to use',
    });
  } else {
    const count = lineTarget.split(',').filter((s) => s.trim()).length;
    const to = `Sending to ${count} recipient${count === 1 ? '' : 's'}`;

    checks.push({
      name: 'LINE alerts',
      status: process.env.LINE_CHANNEL_SECRET ? 'ok' : 'warn',
      detail: to,
      hint: process.env.LINE_CHANNEL_SECRET
        ? undefined
        : 'Alerts will send, but LINE_CHANNEL_SECRET is unset so the webhook cannot verify LINE. Set it to use the "id" helper.',
    });

    /* How much of the month is left. Silent if LINE will not answer. */
    const quota = await lineQuota();
    if (quota) {
      if (!quota.limited) {
        checks.push({
          name: 'LINE messages',
          status: 'ok',
          detail: `${quota.used} sent this month · no monthly limit on this plan`,
        });
      } else {
        const total = quota.total ?? 0;
        const left = Math.max(0, total - quota.used);
        // Each recipient costs one message per event, so a group of two
        // burns the allowance twice as fast as the number suggests.
        const perEvent = count;
        const events = perEvent > 0 ? Math.floor(left / perEvent) : left;

        checks.push({
          name: 'LINE messages',
          status: left === 0 ? 'down' : left < total * 0.15 ? 'warn' : 'ok',
          detail: `${left} of ${total} left this month · about ${events} more alert${events === 1 ? '' : 's'}`,
          hint:
            left === 0
              ? 'The month’s allowance is gone, so LINE is refusing new alerts until it resets. Email is the only channel until then.'
              : left < total * 0.15
                ? 'Running low. It resets at the start of the month; a paid LINE plan raises the ceiling.'
                : undefined,
        });
      }
    }
  }

  /* ---------------- public site url ---------------- */
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  checks.push(
    !site
      ? {
          name: 'Site address',
          status: 'warn',
          detail: 'NEXT_PUBLIC_SITE_URL is not set',
          hint: 'Links inside emails need this',
        }
      : site.includes('localhost')
        ? {
            name: 'Site address',
            status: 'warn',
            detail: site,
            hint: 'Still pointing at localhost — links inside emails will not work for guests',
          }
        : { name: 'Site address', status: 'ok', detail: site }
  );

  /* ---------------- activity log table ---------------- */
  const admin = adminForBookings;
  if (admin) {
    try {
      const { error } = await admin
        .from('activity_log')
        .select('id', { count: 'exact', head: true });
      checks.push(
        error
          ? {
              name: 'Activity log',
              status: 'warn',
              detail: 'Table not found',
              hint: 'Run supabase/schema.sql to enable the activity feed',
            }
          : { name: 'Activity log', status: 'ok', detail: 'Recording events' }
      );
    } catch {
      checks.push({
        name: 'Activity log',
        status: 'warn',
        detail: 'Could not check the table',
      });
    }
  }

  return checks;
}

export function overallStatus(checks: Check[]): CheckStatus {
  if (checks.some((c) => c.status === 'down')) return 'down';
  if (checks.some((c) => c.status === 'warn')) return 'warn';
  return 'ok';
}
